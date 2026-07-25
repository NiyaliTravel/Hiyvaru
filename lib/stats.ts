import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type PublicStats = {
  listenersOnboard: number;
  listenersOnline: number;
  listenersOffline: number;
  members: number;
  activeChats: number;
};

/** Public counts only — nothing identifying. */
export async function getPublicStats(): Promise<PublicStats> {
  const db = getDb();
  const [listeners] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.listenerProfiles)
    .where(and(isNotNull(schema.listenerProfiles.verifiedAt), isNotNull(schema.listenerProfiles.trainingCompletedAt)));
  const [online] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.listenerProfiles)
    .where(
      and(
        eq(schema.listenerProfiles.available, true),
        isNotNull(schema.listenerProfiles.verifiedAt),
        isNotNull(schema.listenerProfiles.trainingCompletedAt),
      ),
    );
  const [members] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.users)
    .where(and(eq(schema.users.role, "member"), eq(schema.users.status, "active")));
  const [activeChats] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.conversations)
    .where(isNull(schema.conversations.endedAt));
  return {
    listenersOnboard: listeners.n,
    listenersOnline: online.n,
    listenersOffline: listeners.n - online.n,
    members: members.n,
    activeChats: activeChats.n,
  };
}
