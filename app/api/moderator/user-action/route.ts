import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

// Moderator account actions: warn / suspend / ban / reinstate.
// Bans revoke sessions immediately (session lookup rejects non-active users).
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const targetId = String(body.userId ?? "");
  const action = String(body.action ?? "");
  const reason = String(body.reason ?? "").slice(0, 2000);
  if (!targetId || !["warn", "suspend", "ban", "reinstate"].includes(action)) {
    return NextResponse.json({ reason: "bad_request" }, { status: 400 });
  }
  const db = getDb();
  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, targetId)).limit(1);
  if (!target) return NextResponse.json({ reason: "not_found" }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ reason: "cannot_action_admin" }, { status: 403 });
  }

  if (action === "suspend" || action === "ban") {
    await db
      .update(schema.users)
      .set({ status: action === "ban" ? "banned" : "suspended" })
      .where(eq(schema.users.id, targetId));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, targetId));
  } else if (action === "reinstate") {
    await db.update(schema.users).set({ status: "active" }).where(eq(schema.users.id, targetId));
  }
  await audit({
    actorId: user.id,
    action: `user_${action}`,
    subjectType: "user",
    subjectId: targetId,
    detail: { reason },
  });
  return NextResponse.json({ ok: true });
}
