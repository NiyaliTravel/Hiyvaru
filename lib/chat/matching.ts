import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { activeConversationCount, createConversation } from "./service";

// ---------------------------------------------------------------------------
// Matching: oldest waiting member -> first eligible listener.
// SAFETY-CRITICAL eligibility (Hard Rule 2): a listener is matchable ONLY if
//   verified_at IS NOT NULL  (admin ID review passed)
//   training_completed_at IS NOT NULL  (quiz at 100%)
//   level is probation/full/mentor (never "applicant")
// plus availability, language, concurrency caps, and member preferences.
// ---------------------------------------------------------------------------

const CAP_BY_LEVEL = { probation: 1, full: 2, mentor: 2 } as const;

export type MatchOutcome =
  | { matched: true; conversationId: string; memberId: string; listenerId: string }
  | { matched: false; queueEntryId?: string };

export async function findEligibleListener(
  memberId: string,
  lang: "dv" | "en",
): Promise<string | null> {
  const db = getDb();

  const prefs = await db
    .select()
    .from(schema.matchPreferences)
    .where(eq(schema.matchPreferences.memberId, memberId));
  const never = new Set(prefs.filter((p) => p.kind === "never_again").map((p) => p.listenerId));
  const favourites = new Set(prefs.filter((p) => p.kind === "favourite").map((p) => p.listenerId));

  const candidates = await db
    .select({ user: schema.users, profile: schema.listenerProfiles })
    .from(schema.listenerProfiles)
    .innerJoin(schema.users, eq(schema.listenerProfiles.userId, schema.users.id))
    .where(
      and(
        eq(schema.users.role, "listener"),
        eq(schema.users.status, "active"),
        eq(schema.listenerProfiles.available, true),
        isNotNull(schema.listenerProfiles.verifiedAt), // Hard Rule 2
        isNotNull(schema.listenerProfiles.trainingCompletedAt),
        inArray(schema.listenerProfiles.level, ["probation", "full", "mentor"]),
        inArray(schema.users.lang, [lang, "both"]),
      ),
    );

  const eligible: Array<{ id: string; favourite: boolean }> = [];
  for (const c of candidates) {
    if (never.has(c.user.id)) continue;
    const cap = CAP_BY_LEVEL[c.profile.level as keyof typeof CAP_BY_LEVEL] ?? 0;
    if ((await activeConversationCount(c.user.id)) >= cap) continue;
    eligible.push({ id: c.user.id, favourite: favourites.has(c.user.id) });
  }
  if (eligible.length === 0) return null;
  // Favourites first, otherwise stable order from the query.
  eligible.sort((a, b) => Number(b.favourite) - Number(a.favourite));
  return eligible[0].id;
}

/** Process one waiting queue entry. Returns the match result. */
export async function attemptMatch(queueEntryId: string): Promise<MatchOutcome> {
  const db = getDb();
  const [entry] = await db
    .select()
    .from(schema.matchQueue)
    .where(and(eq(schema.matchQueue.id, queueEntryId), eq(schema.matchQueue.status, "waiting")))
    .limit(1);
  if (!entry) return { matched: false };

  const listenerId = await findEligibleListener(entry.memberId, entry.lang);
  if (!listenerId) return { matched: false, queueEntryId };

  const conv = await createConversation(entry.memberId, listenerId, entry.lang);
  await db
    .update(schema.matchQueue)
    .set({ status: "matched", conversationId: conv.id })
    .where(eq(schema.matchQueue.id, entry.id));
  return {
    matched: true,
    conversationId: conv.id,
    memberId: entry.memberId,
    listenerId,
  };
}

export async function enqueueMember(memberId: string, lang: "dv" | "en"): Promise<string> {
  const db = getDb();
  // One waiting entry per member.
  await db
    .update(schema.matchQueue)
    .set({ status: "cancelled" })
    .where(and(eq(schema.matchQueue.memberId, memberId), eq(schema.matchQueue.status, "waiting")));
  const [row] = await db
    .insert(schema.matchQueue)
    .values({ memberId, lang })
    .returning({ id: schema.matchQueue.id });
  return row.id;
}

export async function cancelWaiting(memberId: string): Promise<void> {
  await getDb()
    .update(schema.matchQueue)
    .set({ status: "cancelled" })
    .where(and(eq(schema.matchQueue.memberId, memberId), eq(schema.matchQueue.status, "waiting")));
}

/** Mark entries older than `ms` as timed out; returns affected member ids. */
export async function timeOutStale(ms: number): Promise<string[]> {
  const db = getDb();
  const cutoff = new Date(Date.now() - ms);
  const rows = await db
    .update(schema.matchQueue)
    .set({ status: "timed_out" })
    .where(
      and(
        eq(schema.matchQueue.status, "waiting"),
        sql`${schema.matchQueue.createdAt} < ${cutoff}`,
      ),
    )
    .returning({ memberId: schema.matchQueue.memberId });
  return rows.map((r) => r.memberId);
}
