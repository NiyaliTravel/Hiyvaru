import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { runMatchSweep } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "listener") {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const available = !!body.available;
  const db = getDb();
  // SAFETY (Hard Rule 2): availability alone never makes a listener matchable —
  // the matcher independently checks verified_at + training_completed_at.
  await db
    .update(schema.listenerProfiles)
    .set({ available })
    .where(eq(schema.listenerProfiles.userId, user.id));
  if (available) runMatchSweep().catch(() => {});
  return NextResponse.json({ ok: true, available });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "listener") {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const [profile] = await getDb()
    .select()
    .from(schema.listenerProfiles)
    .where(eq(schema.listenerProfiles.userId, user.id))
    .limit(1);
  return NextResponse.json({
    available: profile?.available ?? false,
    level: profile?.level ?? "applicant",
    verified: !!profile?.verifiedAt,
    trained: !!profile?.trainingCompletedAt,
  });
}
