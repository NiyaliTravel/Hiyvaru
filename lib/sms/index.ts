import { appendFileSync, mkdirSync } from "fs";

// SMS gateway with a hard mock mode.
// Real mode only when all three Twilio env vars are present; otherwise every
// message is logged and appended to .data/outbox.jsonl so local dev and the
// crisis-drill exit test can verify delivery without a Twilio account.

export type SmsResult = { mode: "twilio" | "mock"; to: string; body: string };

export function smsMode(): "twilio" | "mock" {
  return process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
    ? "twilio"
    : "mock";
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (smsMode() === "twilio") {
    const twilio = (await import("twilio")).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
    await client.messages.create({
      to,
      from: process.env.TWILIO_FROM_NUMBER!,
      body,
    });
    return { mode: "twilio", to, body };
  }
  const entry = { at: new Date().toISOString(), to, body };
  console.log(`[sms:mock] to=${to} body=${JSON.stringify(body)}`);
  try {
    mkdirSync(".data", { recursive: true });
    appendFileSync(".data/outbox.jsonl", JSON.stringify(entry) + "\n");
  } catch {
    // scratch logging only — never let it break an OTP or crisis alert
  }
  return { mode: "mock", to, body };
}
