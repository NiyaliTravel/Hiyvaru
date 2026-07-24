import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

/** Active (not ended) conversations for the current user — for reconnects. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const db = getDb();
  const col =
    user.role === "listener" ? schema.conversations.listenerId : schema.conversations.memberId;
  const rows = await db
    .select({
      id: schema.conversations.id,
      lang: schema.conversations.lang,
      startedAt: schema.conversations.startedAt,
      escalated: schema.conversations.escalated,
    })
    .from(schema.conversations)
    .where(and(eq(col, user.id), isNull(schema.conversations.endedAt)))
    .orderBy(desc(schema.conversations.startedAt));
  return NextResponse.json({ conversations: rows });
}
