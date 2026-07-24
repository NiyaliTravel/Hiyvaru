import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { checkAge } from "./age";
import { hashPhone, isValidPhone, normalizePhone } from "./crypto";
import { generateUniqueDisplayName } from "./names";
import { verifyOtp } from "./otp";

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — signup is the 16+ gate (Hard Rule 1).
// Every account creation path MUST go through completeSignup(). There is no
// other INSERT into users for members/listeners anywhere in the codebase.
// ---------------------------------------------------------------------------

export type SignupInput = {
  channel: "sms" | "email";
  phone?: string;
  email?: string;
  code: string;
  dob: string; // YYYY-MM-DD — validated then discarded; only year stored
  lang: "dv" | "en" | "both";
};

export type SignupResult =
  | { ok: true; userId: string; displayName: string }
  | {
      ok: false;
      reason:
        | "under_16"
        | "invalid_date"
        | "implausible"
        | "bad_otp"
        | "invalid_destination"
        | "already_registered";
    };

export async function completeSignup(input: SignupInput): Promise<SignupResult> {
  const db = getDb();

  // 1) Age gate FIRST — never even verify the OTP for an under-16 attempt,
  //    so no partial state exists for rejected signups.
  const age = checkAge(input.dob);
  if (!age.ok) return { ok: false, reason: age.reason };

  // 2) Resolve destination
  let phoneHash: string | null = null;
  let email: string | null = null;
  let destination: string;
  if (input.channel === "sms") {
    if (!input.phone || !isValidPhone(input.phone)) {
      return { ok: false, reason: "invalid_destination" };
    }
    phoneHash = hashPhone(normalizePhone(input.phone));
    destination = phoneHash;
  } else {
    email = input.email?.trim().toLowerCase() ?? "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { ok: false, reason: "invalid_destination" };
    }
    destination = email;
  }

  // 3) OTP proves control of the phone/email
  if (!(await verifyOtp(destination, input.code))) {
    return { ok: false, reason: "bad_otp" };
  }

  // 4) Uniqueness
  const existing = phoneHash
    ? await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.phoneHash, phoneHash)).limit(1)
    : await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email!)).limit(1);
  if (existing.length > 0) return { ok: false, reason: "already_registered" };

  // 5) Create the anonymous member. Full DOB is dropped here — year only.
  const displayName = await generateUniqueDisplayName(async (name) => {
    const hit = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.displayName, name))
      .limit(1);
    return hit.length > 0;
  });

  const [user] = await db
    .insert(schema.users)
    .values({
      role: "member",
      phoneHash,
      email,
      birthYear: age.birthYear,
      displayName,
      lang: input.lang,
    })
    .returning({ id: schema.users.id });

  return { ok: true, userId: user.id, displayName };
}
