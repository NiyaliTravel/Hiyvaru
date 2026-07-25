import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Fixed topic taxonomy for Browse Listeners. Labels live in messages (topics.*).
export const TOPICS = [
  "stress", "anxiety", "family", "relationships",
  "work", "study", "grief", "loneliness", "faith", "identity",
] as const;
export type Topic = (typeof TOPICS)[number];

export type BrowseListener = {
  id: string;
  displayName: string;
  bio: string | null;
  lang: "dv" | "en" | "both";
  level: "probation" | "full" | "mentor";
  topics: string[];
  online: boolean;
  favourite: boolean;
};

/**
 * Listeners a member may browse. SAFETY (Hard Rule 2): only verified + trained,
 * active listeners are ever returned. Anonymous fields only — no phone/email.
 */
export async function getBrowsableListeners(
  memberId: string,
  filter: { lang?: "dv" | "en"; onlineOnly?: boolean; topic?: string } = {},
): Promise<BrowseListener[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      lang: schema.users.lang,
      bio: schema.listenerProfiles.bio,
      level: schema.listenerProfiles.level,
      topics: schema.listenerProfiles.topics,
      available: schema.listenerProfiles.available,
    })
    .from(schema.listenerProfiles)
    .innerJoin(schema.users, eq(schema.listenerProfiles.userId, schema.users.id))
    .where(
      and(
        eq(schema.users.role, "listener"),
        eq(schema.users.status, "active"),
        isNotNull(schema.listenerProfiles.verifiedAt),
        isNotNull(schema.listenerProfiles.trainingCompletedAt),
        inArray(schema.listenerProfiles.level, ["probation", "full", "mentor"]),
      ),
    );

  const prefs = await db
    .select()
    .from(schema.matchPreferences)
    .where(eq(schema.matchPreferences.memberId, memberId));
  const never = new Set(prefs.filter((p) => p.kind === "never_again").map((p) => p.listenerId));
  const favourites = new Set(prefs.filter((p) => p.kind === "favourite").map((p) => p.listenerId));

  let list: BrowseListener[] = rows
    .filter((r) => !never.has(r.id))
    .map((r) => ({
      id: r.id,
      displayName: r.displayName,
      bio: r.bio,
      lang: r.lang,
      level: r.level as "probation" | "full" | "mentor",
      topics: r.topics ?? [],
      online: !!r.available,
      favourite: favourites.has(r.id),
    }));

  if (filter.lang) list = list.filter((l) => l.lang === filter.lang || l.lang === "both");
  if (filter.onlineOnly) list = list.filter((l) => l.online);
  if (filter.topic) list = list.filter((l) => l.topics.includes(filter.topic!));

  // Favourites first, then online, then mentors.
  const levelRank = { mentor: 0, full: 1, probation: 2 };
  return list.sort(
    (a, b) =>
      Number(b.favourite) - Number(a.favourite) ||
      Number(b.online) - Number(a.online) ||
      levelRank[a.level] - levelRank[b.level],
  );
}
