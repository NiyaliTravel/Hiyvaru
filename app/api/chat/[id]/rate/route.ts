import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getConversation } from "@/lib/chat/service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const conv = await getConversation(id);
  if (!conv || conv.memberId !== user.id) {
    return NextResponse.json({ reason: "not_found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const stars = Number(body.stars);
  const keep: "favourite" | "never_again" | "none" =
    body.keep === "favourite" || body.keep === "never_again" ? body.keep : "none";
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ reason: "bad_stars" }, { status: 400 });
  }
  const db = getDb();
  await db.insert(schema.ratings).values({
    conversationId: conv.id,
    memberId: user.id,
    listenerId: conv.listenerId,
    stars,
    flag: !!body.flag,
  });
  if (keep !== "none") {
    await db
      .delete(schema.matchPreferences)
      .where(
        and(
          eq(schema.matchPreferences.memberId, user.id),
          eq(schema.matchPreferences.listenerId, conv.listenerId),
        ),
      );
    await db.insert(schema.matchPreferences).values({
      memberId: user.id,
      listenerId: conv.listenerId,
      kind: keep,
    });
  }
  return NextResponse.json({ ok: true });
}
