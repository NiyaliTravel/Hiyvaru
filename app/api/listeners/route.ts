import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getBrowsableListeners } from "@/lib/listeners";

// Browse Listeners feed (members only). Anonymous, safety-filtered.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const langParam = sp.get("lang");
  const listeners = await getBrowsableListeners(user.id, {
    lang: langParam === "dv" || langParam === "en" ? langParam : undefined,
    onlineOnly: sp.get("online") === "1",
    topic: sp.get("topic") ?? undefined,
  });
  return NextResponse.json({ listeners });
}
