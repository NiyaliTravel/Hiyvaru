import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export type OngoingListener = { id: string; displayName: string; online: boolean };

/** A member's kept ("favourite") listeners, with current availability. */
export async function getOngoingListeners(memberId: string): Promise<OngoingListener[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      available: schema.listenerProfiles.available,
      verifiedAt: schema.listenerProfiles.verifiedAt,
    })
    .from(schema.matchPreferences)
    .innerJoin(schema.users, eq(schema.matchPreferences.listenerId, schema.users.id))
    .leftJoin(schema.listenerProfiles, eq(schema.listenerProfiles.userId, schema.users.id))
    .where(
      and(
        eq(schema.matchPreferences.memberId, memberId),
        eq(schema.matchPreferences.kind, "favourite"),
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    online: !!r.available && !!r.verifiedAt,
  }));
}

/** Time-of-day bucket in Maldives local time (UTC+5). */
export function greetingKey(now: Date = new Date()): "Morning" | "Afternoon" | "Evening" | "Night" {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Indian/Maldives",
    }).format(now),
  ) % 24;
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 22) return "Evening";
  return "Night";
}
