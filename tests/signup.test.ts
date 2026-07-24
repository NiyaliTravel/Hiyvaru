import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "./setup";
import { getDb, schema } from "@/lib/db";
import { completeSignup } from "@/lib/auth/signup";
import { issueOtp } from "@/lib/auth/otp";
import { hashPhone, normalizePhone, sha256 } from "@/lib/auth/crypto";

// SAFETY EXIT TEST (Phase A): full signup path against a real (PGlite)
// Postgres — under-16 signup is impossible end-to-end; accounts store only
// birth year and an auto-generated anonymous name.

const PHONE = "+9607712345";

async function latestOtpCodeFor(destination: string): Promise<string> {
  // Tests read the code back by brute-forcing the hash space is not viable;
  // instead we re-issue with a known code by capturing from the DB insert.
  // Simpler: look up the row and regenerate — so instead we intercept via
  // issueOtp + direct row overwrite with a known code hash.
  const db = getDb();
  const rows = await db.select().from(schema.otpCodes).where(eq(schema.otpCodes.destination, destination));
  const otp = rows[rows.length - 1];
  await db
    .update(schema.otpCodes)
    .set({ codeHash: sha256("123456") })
    .where(eq(schema.otpCodes.id, otp.id));
  return "123456";
}

describe("signup (service level, real DB)", () => {
  beforeAll(async () => {
    await freshDb();
  });

  it("rejects an under-16 signup before OTP is even checked", async () => {
    const result = await completeSignup({
      channel: "sms",
      phone: PHONE,
      code: "000000",
      dob: "2012-01-01",
      lang: "dv",
    });
    expect(result).toEqual({ ok: false, reason: "under_16" });
    const users = await getDb().select().from(schema.users);
    expect(users.length).toBe(0); // no partial state
  });

  it("creates an account for a 16+ signup with year-only DOB and anon name", async () => {
    const destination = hashPhone(normalizePhone(PHONE));
    await issueOtp({ destination, channel: "sms", sendTo: PHONE });
    const code = await latestOtpCodeFor(destination);

    const result = await completeSignup({
      channel: "sms",
      phone: PHONE,
      code,
      dob: "1995-06-10",
      lang: "dv",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [user] = await getDb().select().from(schema.users).where(eq(schema.users.id, result.userId));
    expect(user.birthYear).toBe(1995);
    expect(user.displayName).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/);
    expect(user.role).toBe("member");
    // Anonymity: no plaintext phone anywhere on the row
    expect(JSON.stringify(user)).not.toContain("7712345");
  });

  it("rejects a wrong OTP", async () => {
    const result = await completeSignup({
      channel: "sms",
      phone: "+9607799999",
      code: "999999",
      dob: "1990-01-01",
      lang: "en",
    });
    expect(result).toEqual({ ok: false, reason: "bad_otp" });
  });

  it("rejects duplicate registration for the same phone", async () => {
    const destination = hashPhone(normalizePhone(PHONE));
    // cooldown: wait is skipped by writing the OTP row directly
    await getDb().insert(schema.otpCodes).values({
      destination,
      channel: "sms",
      codeHash: sha256("222222"),
      expiresAt: new Date(Date.now() + 600_000),
    });
    const result = await completeSignup({
      channel: "sms",
      phone: PHONE,
      code: "222222",
      dob: "1988-02-02",
      lang: "en",
    });
    expect(result).toEqual({ ok: false, reason: "already_registered" });
  });
});
