import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/** sha256 hex — used for session ids and OTP code hashes. */
export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** HMAC of a normalized phone number. Plaintext numbers are never stored. */
export function hashPhone(phone: string): string {
  const secret = process.env.PHONE_HASH_SECRET;
  if (!secret) throw new Error("PHONE_HASH_SECRET is not set");
  return createHmac("sha256", secret).update(normalizePhone(phone)).digest("hex");
}

/** Normalize Maldivian and international numbers to +960XXXXXXX style. */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-()]/g, "");
  if (/^7\d{6}$|^9\d{6}$/.test(p)) p = `+960${p}`; // local mobile without CC
  if (/^960\d{7}$/.test(p)) p = `+${p}`;
  return p;
}

export function isValidPhone(raw: string): boolean {
  return /^\+\d{8,15}$/.test(normalizePhone(raw));
}

export function generateOtpCode(): string {
  // 6-digit, crypto-random, no leading-zero loss
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
