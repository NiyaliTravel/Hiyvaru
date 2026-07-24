import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getConversation, isParticipant } from "@/lib/chat/service";
import { escalateConversation } from "@/lib/safety/escalate";

// SAFETY (Hard Rule 3): either participant can trigger the crisis protocol.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const conv = await getConversation(id);
  if (!conv || !isParticipant(conv, user.id)) {
    return NextResponse.json({ reason: "not_found" }, { status: 404 });
  }
  const trigger = user.id === conv.listenerId ? "listener_button" : "member_button";
  const result = await escalateConversation({
    conversationId: conv.id,
    trigger,
    triggeredBy: user.id,
  });
  if (!result.ok) return NextResponse.json({ reason: "failed" }, { status: 400 });
  return NextResponse.json({ ok: true, escalationId: result.escalationId });
}
