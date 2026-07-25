import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { audit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — listener ID verification (Hard Rule 2).
// ID card/passport photo + live selfie are stored AES-256-GCM encrypted with
// ID_DOC_MASTER_KEY (separate from the message key), visible ONLY to admin,
// and hard-purged the moment a decision is made. Retained afterwards: only
// verified ✔ / doc type / doc expiry.
// ---------------------------------------------------------------------------

function idDocKey(): Buffer {
  const hex = process.env.ID_DOC_MASTER_KEY;
  if (!hex || hex.length !== 64) throw new Error("ID_DOC_MASTER_KEY must be 32 bytes hex");
  return Buffer.from(hex, "hex");
}

function encryptDoc(dataBase64: string): { ciphertext: string; iv: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", idDocKey(), iv);
  const raw = Buffer.from(dataBase64, "base64");
  const enc = Buffer.concat([cipher.update(raw), cipher.final(), cipher.getAuthTag()]);
  return { ciphertext: enc.toString("base64"), iv: iv.toString("hex") };
}

function decryptDoc(ciphertext: string, ivHex: string): Buffer {
  const data = Buffer.from(ciphertext, "base64");
  const body = data.subarray(0, data.length - 16);
  const tag = data.subarray(data.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", idDocKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

const MAX_DOC_BYTES = 8 * 1024 * 1024;

export async function submitApplication(opts: {
  userId: string;
  docType: "national_id" | "passport";
  docExpiry: string; // YYYY-MM-DD
  idImageBase64: string;
  idImageMime: string;
  selfieBase64: string;
  selfieMime: string;
  bio?: string;
  topics?: string[];
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = getDb();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.docExpiry)) return { ok: false, reason: "bad_expiry" };
  if (new Date(opts.docExpiry).getTime() < Date.now()) return { ok: false, reason: "doc_expired" };
  for (const img of [opts.idImageBase64, opts.selfieBase64]) {
    if (!img || Buffer.from(img, "base64").length > MAX_DOC_BYTES) {
      return { ok: false, reason: "bad_image" };
    }
  }
  if (!/^image\//.test(opts.idImageMime) || !/^image\//.test(opts.selfieMime)) {
    return { ok: false, reason: "bad_image" };
  }

  const existing = await db
    .select()
    .from(schema.listenerProfiles)
    .where(eq(schema.listenerProfiles.userId, opts.userId))
    .limit(1);
  if (existing.length > 0 && existing[0].level !== "applicant") {
    return { ok: false, reason: "already_listener" };
  }
  const cleanTopics = Array.isArray(opts.topics) ? opts.topics.slice(0, 10) : undefined;
  if (existing.length === 0) {
    await db.insert(schema.listenerProfiles).values({
      userId: opts.userId,
      level: "applicant",
      docType: opts.docType,
      docExpiry: opts.docExpiry,
      bio: opts.bio?.slice(0, 1000),
      topics: cleanTopics,
    });
  } else {
    await db
      .update(schema.listenerProfiles)
      .set({ docType: opts.docType, docExpiry: opts.docExpiry, bio: opts.bio?.slice(0, 1000), topics: cleanTopics })
      .where(eq(schema.listenerProfiles.userId, opts.userId));
  }

  // Replace any previous uploads for this user
  await db.delete(schema.idDocuments).where(eq(schema.idDocuments.userId, opts.userId));
  const idEnc = encryptDoc(opts.idImageBase64);
  const selfieEnc = encryptDoc(opts.selfieBase64);
  await db.insert(schema.idDocuments).values([
    { userId: opts.userId, kind: "id_front", ciphertext: idEnc.ciphertext, iv: idEnc.iv, mimeType: opts.idImageMime },
    { userId: opts.userId, kind: "selfie", ciphertext: selfieEnc.ciphertext, iv: selfieEnc.iv, mimeType: opts.selfieMime },
  ]);
  await audit({
    actorId: opts.userId,
    action: "listener_application_submitted",
    subjectType: "user",
    subjectId: opts.userId,
  });
  return { ok: true };
}

/** Admin-only: decrypt the two images for side-by-side review. */
export async function getApplicationImages(
  userId: string,
): Promise<Array<{ kind: string; mimeType: string; dataBase64: string }>> {
  const rows = await getDb()
    .select()
    .from(schema.idDocuments)
    .where(eq(schema.idDocuments.userId, userId));
  return rows.map((r) => ({
    kind: r.kind,
    mimeType: r.mimeType,
    dataBase64: decryptDoc(r.ciphertext, r.iv).toString("base64"),
  }));
}

/**
 * Admin decision. Approve: role -> listener, level -> probation, verified_at
 * set. Reject: profile stays applicant, docs still purged.
 * EITHER WAY the ID images are hard-deleted here — purge-after-decision.
 */
export async function decideApplication(opts: {
  adminId: string;
  userId: string;
  approve: boolean;
  note?: string;
}): Promise<{ ok: boolean; purgedDocs: number }> {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(schema.listenerProfiles)
    .where(eq(schema.listenerProfiles.userId, opts.userId))
    .limit(1);
  if (!profile) return { ok: false, purgedDocs: 0 };

  if (opts.approve) {
    await db
      .update(schema.listenerProfiles)
      .set({ verifiedAt: new Date(), level: "probation", probationChatsLeft: 10 })
      .where(eq(schema.listenerProfiles.userId, opts.userId));
    await db
      .update(schema.users)
      .set({ role: "listener" })
      .where(and(eq(schema.users.id, opts.userId), eq(schema.users.role, "member")));
  }

  // SAFETY: purge ID images immediately after the decision, approve or reject.
  const purged = await db
    .delete(schema.idDocuments)
    .where(eq(schema.idDocuments.userId, opts.userId))
    .returning({ id: schema.idDocuments.id });

  await audit({
    actorId: opts.adminId,
    action: opts.approve ? "listener_approved" : "listener_rejected",
    subjectType: "user",
    subjectId: opts.userId,
    detail: { note: opts.note, purgedDocs: purged.length },
  });
  return { ok: true, purgedDocs: purged.length };
}
