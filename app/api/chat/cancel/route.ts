import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { cancelWaiting } from "@/lib/chat/matching";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  await cancelWaiting(user.id);
  return NextResponse.json({ ok: true });
}
