import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

async function requireModerator() {
  const user = await getSessionUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) return null;
  return user;
}

export async function GET() {
  const user = await requireModerator();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const rows = await getDb()
    .select()
    .from(schema.escalations)
    .orderBy(desc(schema.escalations.createdAt))
    .limit(100);
  return NextResponse.json({ escalations: rows });
}

/** Resolve an escalation with a note of actions taken (always audited). */
export async function POST(req: NextRequest) {
  const user = await requireModerator();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.escalationId ?? "");
  const actionsTaken = String(body.actionsTaken ?? "").slice(0, 4000);
  if (!id || !actionsTaken) return NextResponse.json({ reason: "bad_request" }, { status: 400 });
  const [row] = await getDb()
    .update(schema.escalations)
    .set({ moderatorId: user.id, actionsTaken, resolvedAt: new Date() })
    .where(eq(schema.escalations.id, id))
    .returning();
  if (!row) return NextResponse.json({ reason: "not_found" }, { status: 404 });
  await audit({
    actorId: user.id,
    action: "escalation_resolved",
    subjectType: "escalation",
    subjectId: id,
    detail: { actionsTaken },
  });
  return NextResponse.json({ ok: true });
}
