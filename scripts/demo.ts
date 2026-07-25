// Phase D exit-test: scripted end-to-end demo of the whole platform:
//   fresh member SIGNUP -> MATCH with a listener -> CHAT -> ESCALATE (crisis
//   card + moderator SMS) -> member HARD DELETE (verified in DB).
// Run with the server up:  npx tsx scripts/demo.ts [baseUrl]
import "dotenv/config";
import { io, type Socket } from "socket.io-client";
import { readFileSync } from "fs";

const BASE = process.argv[2] ?? "http://localhost:3101";
const step = (n: number, s: string) => console.log(`\n[${n}] ${s}`);

async function api(path: string, cookie: string | null, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})), setCookie: res.headers.get("set-cookie") };
}
function lastOtpFor(to: string): string {
  const lines = readFileSync(".data/outbox.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const mine = lines.filter((l) => l.to === to);
  return (mine[mine.length - 1].body as string).match(/\d{6}/)![0];
}
function connect(cookie: string): Socket {
  return io(BASE, { extraHeaders: { cookie } });
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("=== HIYVARU END-TO-END DEMO ===");
  const phone = `+96077${String(Math.floor(10000 + Math.random() * 89999))}`;

  step(1, `Anonymous member signup (${phone}, DOB 1994-03-10 — 16+ gate passes; year only stored)`);
  const r1 = await api("/api/auth/request-otp", null, { channel: "sms", phone, dob: "1994-03-10", purpose: "signup" });
  if (r1.status !== 200) throw new Error(`otp: ${JSON.stringify(r1.data)}`);
  const r2 = await api("/api/auth/signup", null, { channel: "sms", phone, dob: "1994-03-10", code: lastOtpFor(phone), lang: "en" });
  if (r2.status !== 200) throw new Error(`signup: ${JSON.stringify(r2.data)}`);
  const memberCookie = r2.setCookie!.split(";")[0];
  console.log(`    -> anonymous identity: ${r2.data.displayName}`);

  step(2, "Under-16 signup attempt is rejected (born 2012)");
  const under = await api("/api/auth/request-otp", null, { channel: "sms", phone: "+9607799990", dob: "2012-01-01", purpose: "signup" });
  if (under.status !== 403 || under.data.reason !== "under_16") throw new Error("age gate failed!");
  console.log("    -> HTTP 403 under_16, no OTP sent (routed to 1484/1677 page)");

  step(3, "Verified listener goes available");
  const lr = await api("/api/auth/request-otp", null, { channel: "sms", phone: "+9607000010", purpose: "login" });
  if (lr.status !== 200 && lr.data.reason !== "cooldown") throw new Error("listener otp");
  const lg = await api("/api/auth/login", null, { channel: "sms", phone: "+9607000010", code: lastOtpFor("+9607000010") });
  const listenerCookie = lg.setCookie!.split(";")[0];
  const listenerSock = connect(listenerCookie);
  const assigned = new Promise<string>((res) => listenerSock.on("match:assigned", (p: { conversationId: string }) => res(p.conversationId)));
  await new Promise((r) => listenerSock.on("connect", () => r(undefined)));
  await api("/api/listener/availability", listenerCookie, { available: true });

  step(4, "Member taps 'Talk to someone' and is matched");
  const memberSock = connect(memberCookie);
  const found = new Promise<string>((res) => memberSock.on("match:found", (p: { conversationId: string }) => res(p.conversationId)));
  await new Promise((r) => memberSock.on("connect", () => r(undefined)));
  await api("/api/chat/request", memberCookie, { lang: "en" });
  const convId = await Promise.race([found, wait(20000).then(() => { throw new Error("match timeout"); })]);
  await assigned;
  console.log(`    -> matched, conversation ${convId.slice(0, 8)}…`);

  step(5, "They chat (encrypted at rest)");
  await new Promise((r) => memberSock.emit("conv:join", convId, r));
  await new Promise((r) => listenerSock.emit("conv:join", convId, r));
  await new Promise((r) => memberSock.emit("conv:message", { conversationId: convId, text: "It's been a really dark week. I don't want to be here anymore." }, r));
  await new Promise((r) => listenerSock.emit("conv:message", { conversationId: convId, text: "I'm here with you. Thank you for telling me. Take your time." }, r));
  console.log("    -> 2 messages exchanged");

  step(6, "Listener escalates — crisis protocol");
  const memberCrisis = new Promise<void>((res) => memberSock.on("conv:crisis", () => res()));
  const t0 = Date.now();
  await api(`/api/chat/${convId}/escalate`, listenerCookie, {});
  await Promise.race([memberCrisis, wait(5000).then(() => { throw new Error("no crisis card"); })]);
  console.log(`    -> member saw 119/1677/332 2111 card in ${Date.now() - t0}ms; duty moderator SMS:`);
  const sms = readFileSync(".data/outbox.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l)).reverse()
    .find((l) => /CRISIS/.test(l.body));
  console.log(`       ${sms.to}: ${sms.body}`);

  step(7, "Chat ends; member deletes the conversation forever");
  await new Promise((r) => memberSock.emit("conv:end", convId, r));
  const del = await api(`/api/chat/${convId}/delete`, memberCookie, {});
  if (del.status !== 200) throw new Error("delete failed");
  memberSock.close();
  listenerSock.close();

  const { getDb, schema } = await import("../lib/db");
  const { eq } = await import("drizzle-orm");
  const msgs = await getDb().select().from(schema.messages).where(eq(schema.messages.conversationId, convId));
  const [conv] = await getDb().select().from(schema.conversations).where(eq(schema.conversations.id, convId));
  console.log(`    -> DB check: ${msgs.length} message rows, wrapped_key=${conv.wrappedKey}`);
  if (msgs.length !== 0 || conv.wrappedKey !== null) throw new Error("hard delete failed");

  console.log("\n=== DEMO PASS: signup -> match -> chat -> escalate -> delete all working ===");
  process.exit(0);
}

main().catch((e) => {
  console.error("DEMO FAILED:", e);
  process.exit(1);
});
