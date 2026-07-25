// Phase C exit-test drill: a live chat escalates —
//   1. member's screen receives the crisis card event (119/1677)
//   2. duty moderator receives the (mock) SMS within seconds
//   3. the incident is in escalations + audit_log
// Run with the server up:  npx tsx scripts/e2e-crisis.ts [baseUrl]
import "dotenv/config";
import { io, type Socket } from "socket.io-client";
import { readFileSync, statSync } from "fs";

const BASE = process.argv[2] ?? "http://localhost:3101";

async function api(path: string, cookie: string | null, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: res.status,
    data: await res.json().catch(() => ({})),
    setCookie: res.headers.get("set-cookie"),
  };
}

function lastOtp(): string {
  const lines = readFileSync(".data/outbox.jsonl", "utf8").trim().split("\n");
  return (JSON.parse(lines[lines.length - 1]).body as string).match(/\d{6}/)![0];
}

async function login(phone: string): Promise<string> {
  const r1 = await api("/api/auth/request-otp", null, { channel: "sms", phone, purpose: "login" });
  if (r1.status !== 200 && r1.data.reason !== "cooldown") {
    throw new Error(`otp failed: ${JSON.stringify(r1.data)}`);
  }
  const r2 = await api("/api/auth/login", null, { channel: "sms", phone, code: lastOtp() });
  if (r2.status !== 200) throw new Error(`login failed: ${JSON.stringify(r2.data)}`);
  return r2.setCookie!.split(";")[0];
}

function connect(cookie: string): Socket {
  return io(BASE, { extraHeaders: { cookie } });
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("=== Phase C drill: full crisis escalation ===");

  // Listener + member get matched (same flow as Phase B)
  const listenerCookie = await login("+9607000010");
  const listenerSock = connect(listenerCookie);
  const assigned = new Promise<string>((res) =>
    listenerSock.on("match:assigned", (p: { conversationId: string }) => res(p.conversationId)),
  );
  await new Promise((r) => listenerSock.on("connect", () => r(undefined)));
  await api("/api/listener/availability", listenerCookie, { available: true });

  const memberCookie = await login("+9607000020");
  const memberSock = connect(memberCookie);
  await new Promise((r) => memberSock.on("connect", () => r(undefined)));

  // Moderator session watches for the realtime crisis ping
  const moderatorCookie = await login("+9607000002");
  const moderatorSock = connect(moderatorCookie);
  const moderatorPinged = new Promise<string>((res) =>
    moderatorSock.on("moderator:crisis", (p: { conversationId: string }) => res(p.conversationId)),
  );
  await new Promise((r) => moderatorSock.on("connect", () => r(undefined)));

  await api("/api/chat/request", memberCookie, { lang: "dv" });
  const convId = await Promise.race([
    new Promise<string>((res) => memberSock.on("match:found", (p: { conversationId: string }) => res(p.conversationId))),
    wait(20000).then(() => { throw new Error("match timeout"); }),
  ]);
  await assigned;
  console.log(`[matched] conversation ${convId}`);
  await new Promise((r) => memberSock.emit("conv:join", convId, r));
  await new Promise((r) => listenerSock.emit("conv:join", convId, r));

  // Member's screen: the crisis card event
  const memberCrisis = new Promise<void>((res) => memberSock.on("conv:crisis", () => res()));

  // Member sends a message with a risk keyword -> listener gets the soft hint
  const listenerHint = new Promise<void>((res) => listenerSock.on("conv:risk-hint", () => res()));
  await new Promise((r) =>
    memberSock.emit("conv:message", { conversationId: convId, text: "i think i want to die" }, r),
  );
  await Promise.race([listenerHint, wait(5000).then(() => { throw new Error("no risk hint"); })]);
  console.log("[listener] received risk-keyword soft banner ('consider the crisis protocol')");

  // Listener taps ESCALATE
  const smsOutboxSizeBefore = (() => { try { return statSync(".data/outbox.jsonl").size; } catch { return 0; } })();
  const t0 = Date.now();
  const esc = await api(`/api/chat/${convId}/escalate`, listenerCookie, {});
  if (esc.status !== 200) throw new Error(`escalate failed: ${JSON.stringify(esc.data)}`);

  await Promise.race([memberCrisis, wait(5000).then(() => { throw new Error("member never saw crisis card"); })]);
  console.log(`[member] crisis card event received ${Date.now() - t0}ms after escalation (shows 119 / 1677 / 332 2111 tap-to-call)`);

  await Promise.race([moderatorPinged, wait(5000).then(() => { throw new Error("moderator not pinged"); })]);
  console.log(`[moderator] realtime dashboard alert received ${Date.now() - t0}ms after escalation`);

  // Mock SMS to duty moderator
  await wait(300);
  const outbox = readFileSync(".data/outbox.jsonl", "utf8");
  const newLines = outbox.slice(smsOutboxSizeBefore).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const crisisSms = newLines.find((l) => /CRISIS ALERT/.test(l.body));
  if (!crisisSms) throw new Error("no crisis SMS in outbox");
  console.log(`[moderator] SMS delivered (mock) to ${crisisSms.to}: ${JSON.stringify(crisisSms.body)}`);

  // Moderator can open the unlocked chat and resolve; incident is audited
  const transcript = await api(`/api/moderator/conversation/${convId}`, moderatorCookie);
  if (transcript.status !== 200) throw new Error("moderator could not open unlocked chat");
  console.log(`[moderator] unlocked transcript: ${transcript.data.messages.length} message(s) visible`);
  const escList = await api("/api/moderator/escalations", moderatorCookie);
  const incident = escList.data.escalations.find((e: { conversationId: string }) => e.conversationId === convId);
  if (!incident) throw new Error("incident not in escalation queue");
  const resolved = await api("/api/moderator/escalations", moderatorCookie, {
    escalationId: incident.id,
    actionsTaken: "Drill: member shown 119/1677, listener stayed present, no real danger (test).",
  });
  if (resolved.status !== 200) throw new Error("resolve failed");
  console.log("[moderator] incident resolved with actions logged");

  memberSock.close(); listenerSock.close(); moderatorSock.close();

  // Audit-log proof
  const { getDb, schema } = await import("../lib/db");
  const { eq } = await import("drizzle-orm");
  const logs = await getDb().select().from(schema.auditLog).where(eq(schema.auditLog.action, "crisis_escalation"));
  const mine = logs.filter((l) => l.subjectId === convId);
  console.log("=== audit_log proof ===");
  console.log(JSON.stringify({ action: mine[0]?.action, subjectId: mine[0]?.subjectId, detail: mine[0]?.detail }, null, 1));
  if (mine.length === 0) throw new Error("audit entry missing");
  console.log("=== PASS: crisis drill complete — card shown, SMS sent, incident logged & resolved ===");
  process.exit(0);
}

main().catch((e) => {
  console.error("DRILL FAILED:", e);
  process.exit(1);
});
