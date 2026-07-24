import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  // Only anonymity-safe fields leave the server.
  return NextResponse.json({
    id: user.id,
    role: user.role,
    displayName: user.displayName,
    lang: user.lang,
  });
}
