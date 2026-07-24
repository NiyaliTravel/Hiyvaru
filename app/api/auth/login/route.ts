import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { hashPhone, isValidPhone, normalizePhone } from "@/lib/auth/crypto";
import { verifyOtp } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";

const HOME_BY_ROLE = {
  member: "member",
  listener: "listener",
  moderator: "moderator",
  admin: "admin",
} as const;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { channel, phone, email, code } = body as {
    channel?: "sms" | "email";
    phone?: string;
    email?: string;
    code?: string;
  };

  let destination: string;
  if (channel === "sms") {
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ reason: "invalid_destination" }, { status: 400 });
    }
    destination = hashPhone(normalizePhone(phone));
  } else if (channel === "email") {
    destination = (email ?? "").trim().toLowerCase();
  } else {
    return NextResponse.json({ reason: "invalid_destination" }, { status: 400 });
  }

  if (!code || !(await verifyOtp(destination, code))) {
    return NextResponse.json({ reason: "bad_otp" }, { status: 400 });
  }

  const db = getDb();
  const rows =
    channel === "sms"
      ? await db.select().from(schema.users).where(eq(schema.users.phoneHash, destination)).limit(1)
      : await db.select().from(schema.users).where(eq(schema.users.email, destination)).limit(1);
  const user = rows[0];
  if (!user) return NextResponse.json({ reason: "no_account" }, { status: 404 });
  if (user.status === "banned" || user.status === "suspended") {
    return NextResponse.json({ reason: "account_blocked" }, { status: 403 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, home: HOME_BY_ROLE[user.role] });
}
