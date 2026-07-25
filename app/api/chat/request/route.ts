import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { enqueueMember } from "@/lib/chat/matching";
import { runMatchSweep } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const { rateLimit, newAccountChatAllowed } = await import("@/lib/ratelimit");
  if (!rateLimit(`chatreq:${user.id}`, 20, 3600_000)) {
    return NextResponse.json({ reason: "rate_limited" }, { status: 429 });
  }
  if (!(await newAccountChatAllowed(user.id, user.createdAt))) {
    return NextResponse.json({ reason: "new_account_throttle" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const lang: "dv" | "en" = body.lang === "en" ? "en" : "dv";
  const preferredListenerId =
    typeof body.preferredListenerId === "string" ? body.preferredListenerId : null;
  const queueId = await enqueueMember(user.id, lang, preferredListenerId);
  // Kick a sweep immediately so a free listener means near-instant matching.
  runMatchSweep().catch(() => {});
  return NextResponse.json({ ok: true, queueId });
}
