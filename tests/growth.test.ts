import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "./setup";
import { getDb, schema } from "@/lib/db";
import { getGrowthSummary, sendCheer } from "@/lib/listener/growth";
import { createConversation, endConversation } from "@/lib/chat/service";

async function mkUser(role: "member" | "listener" | "moderator", name: string) {
  const [u] = await getDb()
    .insert(schema.users)
    .values({ role, birthYear: 1990, displayName: name, lang: "both" })
    .returning();
  return u;
}

describe("listener growth (U3)", () => {
  beforeAll(async () => {
    await freshDb();
  });

  it("derives chats supported, probation progress and badges from real activity", async () => {
    const db = getDb();
    const member = await mkUser("member", "GrowthMember");
    const listener = await mkUser("listener", "GrowthListener");
    await db.insert(schema.listenerProfiles).values({
      userId: listener.id,
      verifiedAt: new Date(),
      trainingCompletedAt: new Date(),
      level: "probation",
      probationChatsLeft: 10,
      available: true,
    });

    const before = (await getGrowthSummary(listener.id))!;
    expect(before.chatsSupported).toBe(0);
    expect(before.badges.find((b) => b.slug === "firstChat")!.earned).toBe(false);
    // pipeline milestones are real
    expect(before.badges.find((b) => b.slug === "verified")!.earned).toBe(true);
    expect(before.badges.find((b) => b.slug === "trained")!.earned).toBe(true);

    // complete two conversations
    for (let i = 0; i < 2; i++) {
      const conv = await createConversation(member.id, listener.id, "en");
      await endConversation(conv.id);
    }

    const after = (await getGrowthSummary(listener.id))!;
    expect(after.chatsSupported).toBe(2);
    expect(after.badges.find((b) => b.slug === "firstChat")!.earned).toBe(true);
    expect(after.badges.find((b) => b.slug === "tenChats")!.earned).toBe(false);
    // probation counts down as chats complete (Phase C logic)
    expect(after.probationChatsLeft).toBe(8);
  });

  it("averages ratings and records cheers", async () => {
    const db = getDb();
    const [listener] = await db.select().from(schema.users).where(eq(schema.users.displayName, "GrowthListener"));
    const [member] = await db.select().from(schema.users).where(eq(schema.users.displayName, "GrowthMember"));
    const conv = await createConversation(member.id, listener.id, "en");
    await db.insert(schema.ratings).values([
      { conversationId: conv.id, memberId: member.id, listenerId: listener.id, stars: 5 },
      { conversationId: conv.id, memberId: member.id, listenerId: listener.id, stars: 4 },
    ]);

    const mentor = await mkUser("moderator", "GrowthMentor");
    expect(await sendCheer(mentor.id, listener.id, "You handled that beautifully.")).toBe(true);
    expect(await sendCheer(listener.id, listener.id, "self cheer")).toBe(false); // no self-cheers

    const g = (await getGrowthSummary(listener.id))!;
    expect(g.averageStars).toBeCloseTo(4.5, 1);
    expect(g.ratingsCount).toBe(2);
    expect(g.cheers.length).toBe(1);
    expect(g.cheers[0].note).toContain("beautifully");
  });
});
