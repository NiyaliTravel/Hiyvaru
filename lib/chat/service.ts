import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  decryptMessage,
  encryptMessage,
  newConversationKey,
  unwrapConversationKey,
} from "./encryption";

export type ConversationRow = typeof schema.conversations.$inferSelect;

export async function createConversation(
  memberId: string,
  listenerId: string,
  lang: "dv" | "en",
): Promise<ConversationRow> {
  const db = getDb();
  const { wrapped } = newConversationKey();
  const [conv] = await db
    .insert(schema.conversations)
    .values({
      memberId,
      listenerId,
      lang,
      wrappedKey: wrapped.wrappedKey,
      keyIv: wrapped.keyIv,
    })
    .returning();
  return conv;
}

export async function getConversation(id: string): Promise<ConversationRow | null> {
  const rows = await getDb()
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export function isParticipant(conv: ConversationRow, userId: string): boolean {
  return conv.memberId === userId || conv.listenerId === userId;
}

/** Encrypts and stores a message; returns the row id. Plaintext never persists. */
export async function appendMessage(
  conv: ConversationRow,
  senderId: string,
  text: string,
): Promise<string> {
  if (!conv.wrappedKey || !conv.keyIv) throw new Error("conversation has no key");
  const key = unwrapConversationKey({ wrappedKey: conv.wrappedKey, keyIv: conv.keyIv });
  const { ciphertext, iv } = encryptMessage(key, text);
  const [row] = await getDb()
    .insert(schema.messages)
    .values({ conversationId: conv.id, senderId, ciphertext, iv })
    .returning({ id: schema.messages.id });
  return row.id;
}

export async function listMessages(
  conv: ConversationRow,
): Promise<Array<{ id: string; senderId: string; text: string; createdAt: Date }>> {
  if (!conv.wrappedKey || !conv.keyIv) return [];
  const key = unwrapConversationKey({ wrappedKey: conv.wrappedKey, keyIv: conv.keyIv });
  const rows = await getDb()
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conv.id))
    .orderBy(schema.messages.createdAt);
  return rows.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    text: decryptMessage(key, m.ciphertext, m.iv),
    createdAt: m.createdAt,
  }));
}

export async function endConversation(id: string): Promise<void> {
  const db = getDb();
  const ended = await db
    .update(schema.conversations)
    .set({ endedAt: new Date() })
    .where(and(eq(schema.conversations.id, id), isNull(schema.conversations.endedAt)))
    .returning({ listenerId: schema.conversations.listenerId });
  if (ended.length === 0) return;

  // Probation tracking (spec §3.2): each of the first 10 chats is flagged for
  // mentor spot-review; after 10 the listener is promoted to full.
  const [profile] = await db
    .select()
    .from(schema.listenerProfiles)
    .where(eq(schema.listenerProfiles.userId, ended[0].listenerId))
    .limit(1);
  if (profile?.level === "probation") {
    const left = Math.max(0, profile.probationChatsLeft - 1);
    await db
      .update(schema.listenerProfiles)
      .set({ probationChatsLeft: left, level: left === 0 ? "full" : "probation" })
      .where(eq(schema.listenerProfiles.userId, profile.userId));
    const { audit } = await import("@/lib/audit");
    await audit({
      actorId: null,
      action: left === 0 ? "listener_promoted_full" : "probation_chat_for_review",
      subjectType: "conversation",
      subjectId: id,
      detail: { listenerId: profile.userId, probationChatsLeft: left },
    });
  }
}

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — member hard delete (Hard Rule 4).
// Deletes every message row AND the wrapped per-conversation key. Without the
// key, any ciphertext lingering in backups of other tables is undecryptable.
// Only the member of the conversation may trigger this.
// ---------------------------------------------------------------------------
export async function hardDeleteConversation(
  conversationId: string,
  requestingMemberId: string,
): Promise<{ ok: boolean; deletedMessages: number }> {
  const db = getDb();
  const conv = await getConversation(conversationId);
  if (!conv || conv.memberId !== requestingMemberId) {
    return { ok: false, deletedMessages: 0 };
  }
  const deleted = await db
    .delete(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .returning({ id: schema.messages.id });
  await db
    .delete(schema.keywordFlags)
    .where(eq(schema.keywordFlags.conversationId, conversationId));
  await db
    .update(schema.conversations)
    .set({
      wrappedKey: null,
      keyIv: null,
      deletedAt: new Date(),
      endedAt: conv.endedAt ?? new Date(),
    })
    .where(eq(schema.conversations.id, conversationId));
  return { ok: true, deletedMessages: deleted.length };
}

/** Count of active (started, not ended) conversations for a listener. */
export async function activeConversationCount(listenerId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.listenerId, listenerId),
        isNull(schema.conversations.endedAt),
      ),
    );
  return row.n;
}
