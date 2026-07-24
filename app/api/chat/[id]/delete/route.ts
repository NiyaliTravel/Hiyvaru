import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hardDeleteConversation } from "@/lib/chat/service";
import { emitToConversation } from "@/lib/socket/registry";

// SAFETY (Hard Rule 4): member-initiated hard delete. Messages + wrapped key
// are destroyed; see lib/chat/service.hardDeleteConversation.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const result = await hardDeleteConversation(id, user.id);
  if (!result.ok) return NextResponse.json({ reason: "not_found" }, { status: 404 });
  emitToConversation(id, "conv:deleted", {});
  return NextResponse.json({ ok: true, deletedMessages: result.deletedMessages });
}
