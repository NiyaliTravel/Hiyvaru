// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — Hard Rule 1: 16+ only.
// The full date of birth is validated here at signup and then DISCARDED;
// only the birth year is ever stored. Under-16s are rejected and routed to
// the /under-16 page (helplines 1484 and 1677). Do not weaken this check.
// ---------------------------------------------------------------------------

export const MIN_AGE = 16;

export type AgeCheck =
  | { ok: true; birthYear: number }
  | { ok: false; reason: "invalid_date" | "under_16" | "implausible" };

/** Validates a date-of-birth string (YYYY-MM-DD) against the 16+ rule. */
export function checkAge(dobString: string, now: Date = new Date()): AgeCheck {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobString?.trim() ?? "");
  if (!m) return { ok: false, reason: "invalid_date" };
  const [_, ys, ms, ds] = m;
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  const dob = new Date(Date.UTC(year, month - 1, day));
  // Reject nonsense like 2024-02-31 (Date rolls it over silently).
  if (
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    return { ok: false, reason: "invalid_date" };
  }
  if (dob.getTime() > now.getTime()) return { ok: false, reason: "invalid_date" };
  if (year < now.getUTCFullYear() - 120) return { ok: false, reason: "implausible" };

  // Exact age in whole years as of "now" (UTC).
  let age = now.getUTCFullYear() - year;
  const birthdayThisYear = Date.UTC(now.getUTCFullYear(), month - 1, day);
  if (now.getTime() < birthdayThisYear) age -= 1;

  if (age < MIN_AGE) return { ok: false, reason: "under_16" };
  return { ok: true, birthYear: year };
}
