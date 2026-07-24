import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "./setup";
import { getDb, schema } from "@/lib/db";
import {
  appendMessage,
  createConversation,
  getConversation,
  hardDeleteConversation,
  listMessages,
} from "@/lib/chat/service";
import { encryptMessage, newConversationKey, unwrapConversationKey } from "@/lib/chat/encryption";
import { attemptMatch, enqueueMember, findEligibleListener } from "@/lib/chat/matching";

async function mkUser(role: "member" | "listener", name: string) {
  const [u] = await getDb()
    .insert(schema.users)
    .values({ role, birthYear: 1990, displayName: name, lang: "both" })
    .returning();
  return u;
}

describe("chat core (Phase B exit tests, real DB)", () => {
  beforeAll(async () => {
    await freshDb();
  });

  it("encryption round-trips and stores no plaintext", async () => {
    const { key, wrapped } = newConversationKey();
    const { ciphertext } = encryptMessage(key, "a very private thing");
    expect(ciphertext).not.toContain("private");
    expect(unwrapConversationKey(wrapped).equals(key)).toBe(true);
  });

  it("messages are ciphertext in the DB and decrypt via the conversation key", async () => {
    const member = await mkUser("member", "TestMember01");
    const listener = await mkUser("listener", "TestListener01");
    const conv = await createConversation(member.id, listener.id, "dv");
    await appendMessage(conv, member.id, "hello from the member ސަލާމް");
    await appendMessage(conv, listener.id, "hello from the listener");

    const raw = await getDb().select().from(schema.messages).where(eq(schema.messages.conversationId, conv.id));
    expect(raw.length).toBe(2);
    for (const row of raw) {
      expect(row.ciphertext).not.toContain("hello");
      expect(row.ciphertext).toMatch(/^[0-9a-f]+$/);
    }
    const decrypted = await listMessages(conv);
    expect(decrypted.map((m) => m.text)).toEqual([
      "hello from the member ސަލާމް",
      "hello from the listener",
    ]);
  });

  // SAFETY EXIT TEST (Hard Rule 4): member hard delete is verifiably
  // unrecoverable — message rows gone AND the wrapped key destroyed.
  it("member hard delete removes messages and the conversation key", async () => {
    const member = await mkUser("member", "TestMember02");
    const listener = await mkUser("listener", "TestListener02");
    const conv = await createConversation(member.id, listener.id, "en");
    await appendMessage(conv, member.id, "please forget this");
    await appendMessage(conv, listener.id, "of course");

    // a listener (or anyone else) cannot hard-delete
    const denied = await hardDeleteConversation(conv.id, listener.id);
    expect(denied.ok).toBe(false);

    const result = await hardDeleteConversation(conv.id, member.id);
    expect(result).toEqual({ ok: true, deletedMessages: 2 });

    const rows = await getDb().select().from(schema.messages).where(eq(schema.messages.conversationId, conv.id));
    expect(rows.length).toBe(0); // ciphertext rows gone

    const after = await getConversation(conv.id);
    expect(after?.wrappedKey).toBeNull(); // key destroyed
    expect(after?.keyIv).toBeNull();
    expect(after?.deletedAt).not.toBeNull();
    expect(await listMessages(after!)).toEqual([]);
  });

  // SAFETY EXIT TEST (Hard Rule 2): unverified/untrained listeners are never
  // matchable, regardless of availability.
  it("matching only ever selects verified + trained listeners", async () => {
    const member = await mkUser("member", "TestMember03");
    const db = getDb();

    const unverified = await mkUser("listener", "SneakyListener");
    await db.insert(schema.listenerProfiles).values({
      userId: unverified.id,
      available: true, // available but NOT verified/trained
      level: "full",
    });
    expect(await findEligibleListener(member.id, "en")).toBeNull();

    const untrained = await mkUser("listener", "UntrainedListener");
    await db.insert(schema.listenerProfiles).values({
      userId: untrained.id,
      available: true,
      verifiedAt: new Date(),
      level: "full", // verified but training not completed
    });
    expect(await findEligibleListener(member.id, "en")).toBeNull();

    const good = await mkUser("listener", "GoodListener");
    await db.insert(schema.listenerProfiles).values({
      userId: good.id,
      available: true,
      verifiedAt: new Date(),
      trainingCompletedAt: new Date(),
      level: "full",
    });
    expect(await findEligibleListener(member.id, "en")).toBe(good.id);

    // and the full queue path creates a conversation with that listener
    const qid = await enqueueMember(member.id, "en");
    const outcome = await attemptMatch(qid);
    expect(outcome.matched).toBe(true);
    if (outcome.matched) expect(outcome.listenerId).toBe(good.id);
  });

  it("probation listeners cap at 1 concurrent chat", async () => {
    const db = getDb();
    const m1 = await mkUser("member", "CapMember1");
    const m2 = await mkUser("member", "CapMember2");
    const prob = await mkUser("listener", "ProbationLstnr");
    await db.insert(schema.listenerProfiles).values({
      userId: prob.id,
      available: true,
      verifiedAt: new Date(),
      trainingCompletedAt: new Date(),
      level: "probation",
    });
    // make the earlier full listener busy-proof: turn availability off
    await db
      .update(schema.listenerProfiles)
      .set({ available: false })
      .where(eq(schema.listenerProfiles.level, "full"));

    const q1 = await enqueueMember(m1.id, "en");
    const r1 = await attemptMatch(q1);
    expect(r1.matched).toBe(true);

    const q2 = await enqueueMember(m2.id, "en");
    const r2 = await attemptMatch(q2);
    expect(r2.matched).toBe(false); // cap reached
  });

  it("never_again preference is honoured", async () => {
    const db = getDb();
    const member = await mkUser("member", "PickyMember");
    const lst = await mkUser("listener", "BlockedListener");
    await db.insert(schema.listenerProfiles).values({
      userId: lst.id,
      available: true,
      verifiedAt: new Date(),
      trainingCompletedAt: new Date(),
      level: "full",
    });
    // only this listener is available now
    await db
      .update(schema.listenerProfiles)
      .set({ available: false })
      .where(eq(schema.listenerProfiles.level, "probation"));

    expect(await findEligibleListener(member.id, "en")).toBe(lst.id);
    await db.insert(schema.matchPreferences).values({
      memberId: member.id,
      listenerId: lst.id,
      kind: "never_again",
    });
    expect(await findEligibleListener(member.id, "en")).toBeNull();
  });
});
