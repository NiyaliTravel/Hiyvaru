import { beforeAll, describe, expect, it } from "vitest";
import { freshDb } from "./setup";
import { checkOutgoingMessage } from "@/lib/safety/scan";
import { isValidPhone, normalizePhone } from "@/lib/auth/crypto";

// SAFETY TESTS — founder rules 2026-07-25:
// explicit content and contact info are never delivered; risk disclosures
// always are; registration accepts any country's phone number.

describe("outgoing message gate", () => {
  beforeAll(async () => {
    await freshDb();
  });

  it("blocks explicit/sexual content in both languages", async () => {
    for (const text of [
      "send me nudes",
      "do you watch porn",
      "i'm horny right now",
      "let's have sex chat",
      "އޮރިޔާން ފޮޓޯ ފޮނުވަބަލަ",
    ]) {
      const r = await checkOutgoingMessage(text);
      expect(r.allow, text).toBe(false);
      if (!r.allow) expect(r.reason).toBe("explicit");
    }
  });

  it("blocks contact information from either side", async () => {
    for (const text of [
      "call me on 7712345",
      "my number is +960 771 2345",
      "add me @blue_coral on insta",
      "find me on telegram",
      "whatsapp me",
    ]) {
      const r = await checkOutgoingMessage(text);
      expect(r.allow, text).toBe(false);
      if (!r.allow) expect(r.reason).toBe("contact_info");
    }
  });

  it("NEVER blocks risk-of-harm disclosures (they must reach the listener)", async () => {
    const r = await checkOutgoingMessage("i want to die, i can't do this anymore");
    expect(r.allow).toBe(true);
    expect(r.scan.riskTerms.length).toBeGreaterThan(0); // still flagged
  });

  it("allows normal conversation", async () => {
    for (const text of [
      "today was really hard at work",
      "my sister and I argued again",
      "thank you for listening",
    ]) {
      expect((await checkOutgoingMessage(text)).allow, text).toBe(true);
    }
  });
});

describe("international registration", () => {
  it("accepts phone numbers from any country", () => {
    expect(isValidPhone("+9607712345")).toBe(true); // Maldives
    expect(isValidPhone("7712345")).toBe(true); // local shorthand -> +960
    expect(normalizePhone("7712345")).toBe("+9607712345");
    expect(isValidPhone("+919812345678")).toBe(true); // India
    expect(isValidPhone("+94771234567")).toBe(true); // Sri Lanka
    expect(isValidPhone("+8801712345678")).toBe(true); // Bangladesh
    expect(isValidPhone("+447911123456")).toBe(true); // UK
    expect(isValidPhone("12345")).toBe(false); // garbage
  });
});
