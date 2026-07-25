import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getConversation, listMessages } from "@/lib/chat/service";
import { audit } from "@/lib/audit";

// SAFETY: moderators see chat CONTENT only when a crisis or report unlocked
// the conversation (moderator_unlocked). Every view is audited.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const conv = await getConversation(id);
  if (!conv) return NextResponse.json({ reason: "not_found" }, { status: 404 });
  if (!conv.moderatorUnlocked) {
    return NextResponse.json({ reason: "locked" }, { status: 403 });
  }
  const messages = await listMessages(conv);

  // SAFETY: on an escalated conversation the moderator may relay the member's
  // contact to Police 119 / 332 2111. Decrypt it here (audited) — only when
  // escalated, only for moderators/admin.
  let emergencyContact: { phone: string | null; email: string | null } | null = null;
  if (conv.escalated) {
    const { getEmergencyContact } = await import("@/lib/safety/contact");
    emergencyContact = await getEmergencyContact(conv.memberId);
  }

  await audit({
    actorId: user.id,
    action: conv.escalated ? "moderator_viewed_escalated_contact" : "moderator_viewed_conversation",
    subjectType: "conversation",
    subjectId: id,
  });
  return NextResponse.json({
    conversation: {
      id: conv.id,
      lang: conv.lang,
      startedAt: conv.startedAt,
      endedAt: conv.endedAt,
      escalated: conv.escalated,
      memberId: conv.memberId,
      listenerId: conv.listenerId,
    },
    emergencyContact,
    messages,
  });
}
