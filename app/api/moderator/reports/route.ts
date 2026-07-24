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
    .from(schema.reports)
    .orderBy(desc(schema.reports.createdAt))
    .limit(100);
  return NextResponse.json({ reports: rows });
}

/** Update a report status; optionally unlock its conversation for review. */
export async function POST(req: NextRequest) {
  const user = await requireModerator();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.reportId ?? "");
  const status = ["reviewing", "actioned", "dismissed"].includes(body.status) ? body.status : null;
  if (!id || !status) return NextResponse.json({ reason: "bad_request" }, { status: 400 });
  const db = getDb();
  const [report] = await db
    .update(schema.reports)
    .set({ status })
    .where(eq(schema.reports.id, id))
    .returning();
  if (!report) return NextResponse.json({ reason: "not_found" }, { status: 404 });
  if (body.unlockConversation && report.conversationId) {
    // A report review is one of the two policy-sanctioned unlock reasons.
    await db
      .update(schema.conversations)
      .set({ moderatorUnlocked: true })
      .where(eq(schema.conversations.id, report.conversationId));
  }
  await audit({
    actorId: user.id,
    action: "report_status_changed",
    subjectType: "report",
    subjectId: id,
    detail: { status, unlocked: !!body.unlockConversation },
  });
  return NextResponse.json({ ok: true });
}
