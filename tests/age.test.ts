import { describe, expect, it } from "vitest";
import { checkAge } from "@/lib/auth/age";

// SAFETY EXIT TEST (Phase A / Hard Rule 1): the 16+ gate.
const NOW = new Date("2026-07-24T12:00:00Z");

describe("16+ age gate", () => {
  it("rejects a 15-year-old", () => {
    expect(checkAge("2011-07-25", NOW)).toEqual({ ok: false, reason: "under_16" });
  });

  it("rejects someone who turns 16 tomorrow", () => {
    // 16th birthday is 2026-07-25 — still 15 today.
    expect(checkAge("2010-07-25", NOW)).toEqual({ ok: false, reason: "under_16" });
  });

  it("accepts someone whose 16th birthday is today", () => {
    expect(checkAge("2010-07-24", NOW)).toEqual({ ok: true, birthYear: 2010 });
  });

  it("accepts an adult and returns only the birth year", () => {
    const r = checkAge("1990-03-15", NOW);
    expect(r).toEqual({ ok: true, birthYear: 1990 });
    // Nothing but the year is exposed — full DOB is discarded by the caller.
  });

  it("rejects malformed and impossible dates", () => {
    expect(checkAge("15-07-2001", NOW).ok).toBe(false);
    expect(checkAge("2001-02-30", NOW).ok).toBe(false);
    expect(checkAge("", NOW).ok).toBe(false);
    expect(checkAge("2030-01-01", NOW).ok).toBe(false); // future
    expect(checkAge("1801-01-01", NOW)).toEqual({ ok: false, reason: "implausible" });
  });

  it("rejects every age from 0 to 15 exhaustively", () => {
    for (let age = 0; age < 16; age++) {
      const year = NOW.getUTCFullYear() - age;
      // Born today `age` years ago -> exactly `age` years old (>=16 fails)
      const r = checkAge(`${year}-07-24`, NOW);
      if (age < 16) expect(r.ok, `age ${age} must be rejected or exactly-16 ok`).toBe(age >= 16);
    }
  });
});
