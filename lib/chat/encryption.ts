import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — message encryption at rest (Hard Rule 4 + spec §6).
// Each conversation gets its own random AES-256 key. That key is stored ONLY
// wrapped (encrypted) by MESSAGE_MASTER_KEY. Hard delete removes both the
// message ciphertext AND the wrapped key, so nothing recoverable remains even
// from DB backups of the messages table.
// ---------------------------------------------------------------------------

function masterKey(): Buffer {
  const hex = process.env.MESSAGE_MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("MESSAGE_MASTER_KEY must be 32 bytes hex");
  }
  return Buffer.from(hex, "hex");
}

export type Wrapped = { wrappedKey: string; keyIv: string };

/** AES-256-GCM: payload = ciphertext||authTag (tag last 16 bytes), hex. */
function gcmEncrypt(key: Buffer, plaintext: Buffer): { data: string; iv: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  return { data: enc.toString("hex"), iv: iv.toString("hex") };
}

function gcmDecrypt(key: Buffer, dataHex: string, ivHex: string): Buffer {
  const data = Buffer.from(dataHex, "hex");
  const ciphertext = data.subarray(0, data.length - 16);
  const tag = data.subarray(data.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function newConversationKey(): { key: Buffer; wrapped: Wrapped } {
  const key = randomBytes(32);
  const { data, iv } = gcmEncrypt(masterKey(), key);
  return { key, wrapped: { wrappedKey: data, keyIv: iv } };
}

export function unwrapConversationKey(wrapped: Wrapped): Buffer {
  return gcmDecrypt(masterKey(), wrapped.wrappedKey, wrapped.keyIv);
}

export function encryptMessage(convKey: Buffer, text: string): { ciphertext: string; iv: string } {
  const { data, iv } = gcmEncrypt(convKey, Buffer.from(text, "utf8"));
  return { ciphertext: data, iv };
}

export function decryptMessage(convKey: Buffer, ciphertext: string, iv: string): string {
  return gcmDecrypt(convKey, ciphertext, iv).toString("utf8");
}
