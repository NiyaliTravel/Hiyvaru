import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { enqueueMember } from "@/lib/chat/matching";
import { runMatchSweep } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const lang: "dv" | "en" = body.lang === "en" ? "en" : "dv";
  const queueId = await enqueueMember(user.id, lang);
  // Kick a sweep immediately so a free listener means near-instant matching.
  runMatchSweep().catch(() => {});
  return NextResponse.json({ ok: true, queueId });
}
