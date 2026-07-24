// Phase B exit-test drill: two real client sessions (member + listener) over
// HTTP + Socket.IO against a running server, then member hard-delete, then a
// direct DB check proving the messages are gone.
// Run:  npx tsx scripts/e2e-chat.ts [baseUrl]
import "dotenv/config";
import { io, type Socket } from "socket.io-client";
import { readFileSync } from "fs";

const BASE = process.argv[2] ?? "http://localhost:3101";

async function api(path: string, cookie: string | null, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.get("set-cookie");
  return { status: res.status, data: await res.json().catch(() => ({})), setCookie };
}

function lastOtp(): string {
  const lines = readFileSync(".data/outbox.jsonl", "utf8").trim().split("\n");
  const body = JSON.parse(lines[lines.length - 1]).body as string;
  return body.match(/\d{6}/)![0];
}

async function login(phone: string): Promise<string> {
  const r1 = await api("/api/auth/request-otp", null, { channel: "sms", phone, purpose: "login" });
  // cooldown means an OTP was just issued — its code is still in the outbox
  if (r1.status !== 200 && r1.data.reason !== "cooldown") {
    throw new Error(`otp request failed: ${JSON.stringify(r1.data)}`);
  }
  const code = lastOtp();
  console.log(`[login ${phone}] otp-request status=${r1.status} using code=${code}`);
  const r2 = await api("/api/auth/login", null, { channel: "sms", phone, code });
  if (r2.status !== 200) throw new Error(`login failed: ${JSON.stringify(r2.data)}`);
  return r2.setCookie!.split(";")[0];
}

function connect(cookie: string): Socket {
  const sock = io(BASE, { extraHeaders: { cookie } });
  sock.on("connect_error", (e) => console.error("[socket] connect_error:", e.message));
  return sock;
}

function connected(sock: Socket, who: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${who} socket connect timeout`)), 10000);
    sock.on("connect", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("=== Phase B drill: anonymous matched chat between two sessions ===");

  // Session 1: listener logs in, connects, goes available
  const listenerCookie = await login("+9607000010");
  const listenerSock = connect(listenerCookie);
  const assigned = new Promise<string>((resolve) =>
    listenerSock.on("match:assigned", (p: { conversationId: string }) => resolve(p.conversationId)),
  );
  await connected(listenerSock, "listener");
  await api("/api/listener/availability", listenerCookie, { available: true });
  console.log("[listener] logged in, socket connected, available=true");

  // Session 2: member logs in, connects, requests a chat
  const memberCookie = await login("+9607000020");
  const memberSock = connect(memberCookie);
  const found = new Promise<string>((resolve) =>
    memberSock.on("match:found", (p: { conversationId: string }) => resolve(p.conversationId)),
  );
  await connected(memberSock, "member");
  await api("/api/chat/request", memberCookie, { lang: "dv" });
  console.log("[member] logged in, socket connected, requested a chat (dv)");

  const convId = await Promise.race([
    found,
    wait(20000).then(() => {
      throw new Error("match timeout");
    }),
  ]);
  const convIdListener = await assigned;
  if (convId !== convIdListener) throw new Error("conversation id mismatch");
  console.log(`[matched] conversation ${convId}`);

  // Both join; exchange messages
  const memberSeen: string[] = [];
  const listenerSeen: string[] = [];
  memberSock.on("conv:message", (m: { text: string }) => memberSeen.push(m.text));
  listenerSock.on("conv:message", (m: { text: string }) => listenerSeen.push(m.text));
  await new Promise((r) => memberSock.emit("conv:join", convId, r));
  await new Promise((r) => listenerSock.emit("conv:join", convId, r));

  await new Promise((r) => memberSock.emit("conv:message", { conversationId: convId, text: "ސަލާމް — i need to talk" }, r));
  await new Promise((r) => listenerSock.emit("conv:message", { conversationId: convId, text: "I'm here. Take your time." }, r));
  await wait(500);
  console.log(`[member sees]   ${JSON.stringify(memberSeen)}`);
  console.log(`[listener sees] ${JSON.stringify(listenerSeen)}`);
  if (memberSeen.length !== 2 || listenerSeen.length !== 2) throw new Error("message delivery failed");

  // End + member hard delete
  await new Promise((r) => memberSock.emit("conv:end", convId, r));
  const rate = await api(`/api/chat/${convId}/rate`, memberCookie, { stars: 5, keep: "favourite" });
  console.log(`[member] rated 5 stars, keep=favourite -> HTTP ${rate.status}`);
  const del = await api(`/api/chat/${convId}/delete`, memberCookie, {});
  console.log(`[member] hard delete -> HTTP ${del.status} ${JSON.stringify(del.data)}`);

  memberSock.close();
  listenerSock.close();

  // Direct DB proof
  const { getDb, schema } = await import("../lib/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const msgs = await db.select().from(schema.messages).where(eq(schema.messages.conversationId, convId));
  const [conv] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, convId));
  console.log("=== DB proof after hard delete ===");
  console.log(`messages rows for conversation: ${msgs.length}`);
  console.log(`wrapped_key: ${conv.wrappedKey}  key_iv: ${conv.keyIv}  deleted_at: ${conv.deletedAt?.toISOString()}`);
  if (msgs.length !== 0 || conv.wrappedKey !== null) throw new Error("HARD DELETE FAILED");
  console.log("=== PASS: chat matched, messages exchanged, hard delete verified unrecoverable ===");
  process.exit(0);
}

main().catch((e) => {
  console.error("DRILL FAILED:", e);
  process.exit(1);
});
