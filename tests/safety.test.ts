import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "./setup";
import { getDb, schema } from "@/lib/db";
import { escalateConversation } from "@/lib/safety/escalate";
import { scanMessage } from "@/lib/safety/scan";
import { submitApplication, decideApplication, getApplicationImages } from "@/lib/listener/application";
import { submitQuiz } from "@/lib/training/service";
import { TRAINING_MODULES } from "@/lib/training/content";
import { createConversation } from "@/lib/chat/service";
import { findEligibleListener } from "@/lib/chat/matching";

process.env.DUTY_MODERATOR_PHONES = "+9607000002";

async function mkUser(role: "member" | "listener" | "moderator", name: string) {
  const [u] = await getDb()
    .insert(schema.users)
    .values({ role, birthYear: 1990, displayName: name, lang: "both" })
    .returning();
  return u;
}

describe("Phase C safety pipeline (real DB)", () => {
  beforeAll(async () => {
    await freshDb();
  });

  // SAFETY EXIT TEST (Hard Rule 3): escalation writes the incident record,
  // sends the duty-moderator SMS (mock outbox), and lands in the audit log.
  it("crisis escalation records incident + SMS + audit", async () => {
    const member = await mkUser("member", "CrisisMember");
    const listener = await mkUser("listener", "CrisisListener");
    await mkUser("moderator", "TestModerator");
    const conv = await createConversation(member.id, listener.id, "dv");

    const result = await escalateConversation({
      conversationId: conv.id,
      trigger: "listener_button",
      triggeredBy: listener.id,
    });
    expect(result.ok).toBe(true);

    const db = getDb();
    const [c] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, conv.id));
    expect(c.escalated).toBe(true);
    expect(c.moderatorUnlocked).toBe(true); // moderator can review

    const escs = await db.select().from(schema.escalations).where(eq(schema.escalations.conversationId, conv.id));
    expect(escs.length).toBe(1);
    expect(escs[0].trigger).toBe("listener_button");

    const logs = await db.select().from(schema.auditLog).where(eq(schema.auditLog.action, "crisis_escalation"));
    expect(logs.length).toBe(1);
    expect((logs[0].detail as { smsSentTo: number }).smsSentTo).toBe(1);
  });

  it("risk keywords are detected in English and Dhivehi; contact info flagged", async () => {
    const r1 = await scanMessage("sometimes I want to die honestly");
    expect(r1.riskTerms).toContain("want to die");
    const r2 = await scanMessage("މިރޭ އަމިއްލައަށް މަރުވާން ހިތަށްއަރާ");
    expect(r2.riskTerms.length).toBeGreaterThan(0);
    const r3 = await scanMessage("add me on whatsapp 7712345");
    expect(r3.contactInfo).toBe(true);
    const clean = await scanMessage("today was a hard day at work");
    expect(clean.riskTerms).toEqual([]);
    expect(clean.contactInfo).toBe(false);
  });

  // SAFETY EXIT TEST (Hard Rule 2): ID images encrypted at rest, admin-only
  // decrypt, purged after decision with only metadata retained.
  it("listener application: encrypted docs, approval activates, purge after decision", async () => {
    const applicant = await mkUser("member", "ApplicantOne");
    const png = Buffer.from("fake-png-bytes-for-test").toString("base64");
    const sub = await submitApplication({
      userId: applicant.id,
      docType: "national_id",
      docExpiry: "2031-05-01",
      idImageBase64: png,
      idImageMime: "image/png",
      selfieBase64: png,
      selfieMime: "image/jpeg",
    });
    expect(sub).toEqual({ ok: true });

    const db = getDb();
    const docs = await db.select().from(schema.idDocuments).where(eq(schema.idDocuments.userId, applicant.id));
    expect(docs.length).toBe(2);
    for (const d of docs) {
      // encrypted at rest — stored bytes are not the original
      expect(d.ciphertext).not.toBe(png);
    }
    // admin decrypt round-trips
    const images = await getApplicationImages(applicant.id);
    expect(images.map((i) => i.dataBase64)).toEqual([png, png]);

    // not matchable before approval even if somehow available+trained
    const member = await mkUser("member", "WaitingMember");
    expect(await findEligibleListener(member.id, "en")).toBeNull();

    const decision = await decideApplication({ adminId: applicant.id, userId: applicant.id, approve: true });
    expect(decision).toEqual({ ok: true, purgedDocs: 2 });

    // purge: zero doc rows remain
    const after = await db.select().from(schema.idDocuments).where(eq(schema.idDocuments.userId, applicant.id));
    expect(after.length).toBe(0);

    // retained metadata only + activation state
    const [profile] = await db
      .select()
      .from(schema.listenerProfiles)
      .where(eq(schema.listenerProfiles.userId, applicant.id));
    expect(profile.verifiedAt).not.toBeNull();
    expect(profile.docType).toBe("national_id");
    expect(profile.docExpiry).toBe("2031-05-01");
    expect(profile.level).toBe("probation");
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, applicant.id));
    expect(u.role).toBe("listener");
  });

  // SAFETY EXIT TEST: quiz requires 100%; training gate completes only when
  // every module passes.
  it("quiz below 100% never completes a module; all modules => trained", async () => {
    const applicant = await mkUser("member", "TraineeOne");
    await getDb().insert(schema.listenerProfiles).values({ userId: applicant.id, level: "applicant" });

    const first = TRAINING_MODULES[0];
    const wrong = first.quiz.map((q) => (q.answer + 1) % q.options.length);
    const failed = await submitQuiz(applicant.id, first.slug, wrong);
    expect(failed.passed).toBe(false);
    expect(failed.allComplete).toBe(false);

    // one right, rest wrong -> still not passed (must be 100%)
    const partial = first.quiz.map((q, i) => (i === 0 ? q.answer : (q.answer + 1) % q.options.length));
    expect((await submitQuiz(applicant.id, first.slug, partial)).passed).toBe(false);

    let last: Awaited<ReturnType<typeof submitQuiz>> | null = null;
    for (const mod of TRAINING_MODULES) {
      last = await submitQuiz(applicant.id, mod.slug, mod.quiz.map((q) => q.answer));
      expect(last.passed).toBe(true);
    }
    expect(last!.allComplete).toBe(true);

    const [profile] = await getDb()
      .select()
      .from(schema.listenerProfiles)
      .where(eq(schema.listenerProfiles.userId, applicant.id));
    expect(profile.trainingCompletedAt).not.toBeNull();
  });
});
