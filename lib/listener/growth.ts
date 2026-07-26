import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// ---------------------------------------------------------------------------
// Listener growth — the volunteer-retention engine (research doc §6: volunteer
// supply is the hard part, not software). Levels already exist in the profile;
// this derives the visible journey: chats supported, probation progress,
// badges, average rating, and cheers from mentors.
//
// Badges are DERIVED from real activity — never awarded manually, never fake.
// ---------------------------------------------------------------------------

export type Badge = {
  slug: string;
  earned: boolean;
  /** progress toward earning, 0..1 (1 when earned) */
  progress: number;
};

export type GrowthSummary = {
  level: "applicant" | "probation" | "full" | "mentor";
  chatsSupported: number;
  probationChatsLeft: number;
  trainingComplete: boolean;
  verified: boolean;
  averageStars: number | null;
  ratingsCount: number;
  badges: Badge[];
  cheers: Array<{ id: string; note: string | null; from: string; at: string }>;
};

const BADGE_THRESHOLDS: Array<{ slug: string; chats: number }> = [
  { slug: "firstChat", chats: 1 },
  { slug: "tenChats", chats: 10 },
  { slug: "fiftyChats", chats: 50 },
  { slug: "hundredChats", chats: 100 },
];

export async function getGrowthSummary(listenerId: string): Promise<GrowthSummary | null> {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(schema.listenerProfiles)
    .where(eq(schema.listenerProfiles.userId, listenerId))
    .limit(1);
  if (!profile) return null;

  // Chats supported = conversations this listener has actually finished.
  const [{ n: chatsSupported }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.listenerId, listenerId),
        isNotNull(schema.conversations.endedAt),
      ),
    );

  const [rating] = await db
    .select({
      avg: sql<number | null>`avg(${schema.ratings.stars})::float`,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.ratings)
    .where(eq(schema.ratings.listenerId, listenerId));

  const cheerRows = await db
    .select({
      id: schema.cheers.id,
      note: schema.cheers.note,
      from: schema.users.displayName,
      at: schema.cheers.createdAt,
    })
    .from(schema.cheers)
    .innerJoin(schema.users, eq(schema.cheers.fromId, schema.users.id))
    .where(eq(schema.cheers.toId, listenerId))
    .orderBy(desc(schema.cheers.createdAt))
    .limit(20);

  const badges: Badge[] = BADGE_THRESHOLDS.map((b) => ({
    slug: b.slug,
    earned: chatsSupported >= b.chats,
    progress: Math.min(1, chatsSupported / b.chats),
  }));
  // Milestone badges for the pipeline itself
  badges.unshift(
    { slug: "trained", earned: !!profile.trainingCompletedAt, progress: profile.trainingCompletedAt ? 1 : 0 },
    { slug: "verified", earned: !!profile.verifiedAt, progress: profile.verifiedAt ? 1 : 0 },
  );
  badges.push({
    slug: "mentor",
    earned: profile.level === "mentor",
    progress: profile.level === "mentor" ? 1 : 0,
  });

  return {
    level: profile.level,
    chatsSupported,
    probationChatsLeft: profile.probationChatsLeft,
    trainingComplete: !!profile.trainingCompletedAt,
    verified: !!profile.verifiedAt,
    averageStars: rating?.avg ?? null,
    ratingsCount: rating?.n ?? 0,
    badges,
    cheers: cheerRows.map((c) => ({
      id: c.id,
      note: c.note,
      from: c.from,
      at: c.at.toISOString(),
    })),
  };
}

/** Mentors, moderators and admins can cheer a listener. */
export async function sendCheer(fromId: string, toId: string, note?: string): Promise<boolean> {
  if (fromId === toId) return false;
  const db = getDb();
  const [target] = await db
    .select({ id: schema.listenerProfiles.userId })
    .from(schema.listenerProfiles)
    .where(eq(schema.listenerProfiles.userId, toId))
    .limit(1);
  if (!target) return false;
  await db.insert(schema.cheers).values({ fromId, toId, note: note?.slice(0, 500) });
  return true;
}
