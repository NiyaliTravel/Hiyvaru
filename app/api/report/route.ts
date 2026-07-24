import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getConversation, isParticipant } from "@/lib/chat/service";

/** Report the other participant of a conversation. Routed to moderator queue. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const conversationId = String(body.conversationId ?? "");
  const reason = String(body.reason ?? "").slice(0, 2000).trim();
  if (!reason) return NextResponse.json({ reason: "empty" }, { status: 400 });
  const conv = await getConversation(conversationId);
  if (!conv || !isParticipant(conv, user.id)) {
    return NextResponse.json({ reason: "not_found" }, { status: 404 });
  }
  const targetId = conv.memberId === user.id ? conv.listenerId : conv.memberId;
  await getDb().insert(schema.reports).values({
    reporterId: user.id,
    targetId,
    conversationId: conv.id,
    reason,
  });
  return NextResponse.json({ ok: true });
}
