import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — recoverable emergency contact (founder decision 2026-07-25).
// A member's phone number is stored encrypted (AES-256-GCM) under a dedicated
// CONTACT_MASTER_KEY and decrypted ONLY here, ONLY for a confirmed life-safety
// escalation, to hand to Maldives Police. It is never exposed to listeners or
// other members. The login hash (phone_hash) remains the anonymity default.
// ---------------------------------------------------------------------------

function contactKey(): Buffer {
  const hex = process.env.CONTACT_MASTER_KEY;
  if (!hex || hex.length !== 64) throw new Error("CONTACT_MASTER_KEY must be 32 bytes hex");
  return Buffer.from(hex, "hex");
}

export function encryptContact(plain: string): { enc: string; iv: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", contactKey(), iv);
  const out = Buffer.concat([cipher.update(Buffer.from(plain, "utf8")), cipher.final(), cipher.getAuthTag()]);
  return { enc: out.toString("hex"), iv: iv.toString("hex") };
}

export function decryptContact(encHex: string, ivHex: string): string {
  const data = Buffer.from(encHex, "hex");
  const body = data.subarray(0, data.length - 16);
  const tag = data.subarray(data.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", contactKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

/**
 * The contact details we can hand to police for a member. Phone (recoverable,
 * ID-registered SIM in the Maldives) is the actionable one; email is a
 * fallback. Returns whatever exists — never throws on a missing number.
 */
export async function getEmergencyContact(
  userId: string,
): Promise<{ phone: string | null; email: string | null }> {
  const [u] = await getDb().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!u) return { phone: null, email: null };
  let phone: string | null = null;
  if (u.phoneEnc && u.phoneIv) {
    try {
      phone = decryptContact(u.phoneEnc, u.phoneIv);
    } catch {
      phone = null;
    }
  }
  return { phone, email: u.email ?? null };
}
