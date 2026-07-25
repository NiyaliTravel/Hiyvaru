import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "./setup";
import { getDb, schema } from "@/lib/db";
import { getBrowsableListeners } from "@/lib/listeners";
import { isListenerEligibleFor } from "@/lib/chat/matching";

async function mkUser(role: "member" | "listener", name: string, lang: "dv" | "en" | "both" = "both") {
  const [u] = await getDb().insert(schema.users).values({ role, birthYear: 1990, displayName: name, lang }).returning();
  return u;
}

describe("Browse Listeners (U2) — safety filtering", () => {
  beforeAll(async () => {
    await freshDb();
  });

  it("only ever surfaces verified + trained listeners (Hard Rule 2)", async () => {
    const member = await mkUser("member", "BrowseMember");
    const db = getDb();

    const unverified = await mkUser("listener", "UnverifiedL");
    await db.insert(schema.listenerProfiles).values({ userId: unverified.id, available: true, level: "full", topics: ["stress"] });

    const good = await mkUser("listener", "GoodBrowseL", "en");
    await db.insert(schema.listenerProfiles).values({
      userId: good.id, available: true, verifiedAt: new Date(), trainingCompletedAt: new Date(),
      level: "full", topics: ["grief", "work"], bio: "here to listen",
    });

    const list = await getBrowsableListeners(member.id);
    const names = list.map((l) => l.displayName);
    expect(names).toContain("GoodBrowseL");
    expect(names).not.toContain("UnverifiedL");
  });

  it("filters by language, topic, and online; honours never_again", async () => {
    const member = await mkUser("member", "PickyBrowser");
    const db = getDb();
    const [en] = await db.select().from(schema.users).where(eq(schema.users.displayName, "GoodBrowseL"));

    expect((await getBrowsableListeners(member.id, { lang: "en" })).some((l) => l.id === en.id)).toBe(true);
    expect((await getBrowsableListeners(member.id, { lang: "dv" })).some((l) => l.id === en.id)).toBe(false);
    expect((await getBrowsableListeners(member.id, { topic: "grief" })).some((l) => l.id === en.id)).toBe(true);
    expect((await getBrowsableListeners(member.id, { topic: "faith" })).some((l) => l.id === en.id)).toBe(false);

    // preferred-match eligibility mirrors browse
    expect(await isListenerEligibleFor(member.id, en.id, "en")).toBe(true);

    await db.insert(schema.matchPreferences).values({ memberId: member.id, listenerId: en.id, kind: "never_again" });
    expect((await getBrowsableListeners(member.id)).some((l) => l.id === en.id)).toBe(false);
    expect(await isListenerEligibleFor(member.id, en.id, "en")).toBe(false);
  });
});
