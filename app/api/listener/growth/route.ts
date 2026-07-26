import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getGrowthSummary, sendCheer } from "@/lib/listener/growth";

/** A listener's own growth summary. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "listener") {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const summary = await getGrowthSummary(user.id);
  if (!summary) return NextResponse.json({ reason: "not_found" }, { status: 404 });
  return NextResponse.json(summary);
}

/** Send a cheer to another listener (mentors, moderators, admins only). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });

  let allowed = user.role === "moderator" || user.role === "admin";
  if (!allowed && user.role === "listener") {
    const [p] = await getDb()
      .select({ level: schema.listenerProfiles.level })
      .from(schema.listenerProfiles)
      .where(eq(schema.listenerProfiles.userId, user.id))
      .limit(1);
    allowed = p?.level === "mentor";
  }
  if (!allowed) return NextResponse.json({ reason: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const ok = await sendCheer(user.id, String(body.listenerId ?? ""), body.note);
  if (!ok) return NextResponse.json({ reason: "bad_request" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
