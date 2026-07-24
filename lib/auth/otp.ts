import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { generateOtpCode, sha256 } from "./crypto";
import { sendSms } from "@/lib/sms";

const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

/**
 * Issue an OTP to a destination (phoneHash for sms / lowercased email).
 * For sms the real number is used transiently to send and never stored.
 */
export async function issueOtp(opts: {
  destination: string;
  channel: "sms" | "email";
  sendTo: string;
}): Promise<{ ok: true } | { ok: false; reason: "cooldown" }> {
  const db = getDb();
  const recent = await db
    .select({ createdAt: schema.otpCodes.createdAt })
    .from(schema.otpCodes)
    .where(
      and(
        eq(schema.otpCodes.destination, opts.destination),
        gt(schema.otpCodes.createdAt, new Date(Date.now() - RESEND_COOLDOWN_MS)),
      ),
    )
    .limit(1);
  if (recent.length > 0) return { ok: false, reason: "cooldown" };

  const code = generateOtpCode();
  await db.insert(schema.otpCodes).values({
    destination: opts.destination,
    channel: opts.channel,
    codeHash: sha256(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  const body = `Hiyvaru code: ${code}. Valid 10 minutes. Never share this code.`;
  if (opts.channel === "sms") {
    await sendSms(opts.sendTo, body);
  } else {
    // Email delivery is a Phase-2 concern; mock like SMS for now.
    console.log(`[email:mock] to=${opts.sendTo} body=${JSON.stringify(body)}`);
  }
  return { ok: true };
}

export async function verifyOtp(destination: string, code: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.otpCodes)
    .where(
      and(
        eq(schema.otpCodes.destination, destination),
        isNull(schema.otpCodes.consumedAt),
        gt(schema.otpCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(sql`${schema.otpCodes.createdAt} desc`)
    .limit(1);
  const otp = rows[0];
  if (!otp) return false;
  if (otp.attempts >= MAX_ATTEMPTS) return false;
  await db
    .update(schema.otpCodes)
    .set({ attempts: otp.attempts + 1 })
    .where(eq(schema.otpCodes.id, otp.id));
  if (otp.codeHash !== sha256(code.trim())) return false;
  await db
    .update(schema.otpCodes)
    .set({ consumedAt: new Date() })
    .where(eq(schema.otpCodes.id, otp.id));
  return true;
}
