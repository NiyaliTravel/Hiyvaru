import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { checkAge } from "@/lib/auth/age";
import { hashPhone, isValidPhone, normalizePhone } from "@/lib/auth/crypto";
import { issueOtp } from "@/lib/auth/otp";

// SAFETY (Hard Rule 1): for signup requests the age gate runs BEFORE any OTP
// is sent — an under-16 attempt never receives a code and stores no state.
export async function POST(req: NextRequest) {
  // Abuse brake: 10 OTP requests per IP per hour.
  const { rateLimit, clientIp } = await import("@/lib/ratelimit");
  if (!rateLimit(`otp:${clientIp(req)}`, 10, 3600_000)) {
    return NextResponse.json({ reason: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const { channel, phone, email, dob, purpose } = body as {
    channel?: "sms" | "email";
    phone?: string;
    email?: string;
    dob?: string;
    purpose?: "signup" | "login";
  };

  if (channel !== "sms" && channel !== "email") {
    return NextResponse.json({ reason: "invalid_destination" }, { status: 400 });
  }

  if (purpose === "signup") {
    const age = checkAge(dob ?? "");
    if (!age.ok) {
      return NextResponse.json(
        { reason: age.reason },
        { status: age.reason === "under_16" ? 403 : 400 },
      );
    }
  }

  let destination: string;
  let sendTo: string;
  if (channel === "sms") {
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ reason: "invalid_destination" }, { status: 400 });
    }
    sendTo = normalizePhone(phone);
    destination = hashPhone(sendTo);
  } else {
    const e = (email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      return NextResponse.json({ reason: "invalid_destination" }, { status: 400 });
    }
    sendTo = e;
    destination = e;
  }

  if (purpose === "login") {
    const db = getDb();
    const found =
      channel === "sms"
        ? await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.phoneHash, destination)).limit(1)
        : await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, destination)).limit(1);
    if (found.length === 0) {
      return NextResponse.json({ reason: "no_account" }, { status: 404 });
    }
  }

  const result = await issueOtp({ destination, channel, sendTo });
  if (!result.ok) {
    return NextResponse.json({ reason: result.reason }, { status: 429 });
  }
  return NextResponse.json({ ok: true });
}
