import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

// Listener Lounge: private listener-only group space for debrief and mutual
// support. Mentors and moderators can read; members never can.
async function requireLounge() {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === "listener" || user.role === "moderator" || user.role === "admin") return user;
  return null;
}

export async function GET() {
  const user = await requireLounge();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const rows = await getDb()
    .select({
      id: schema.loungePosts.id,
      body: schema.loungePosts.body,
      kind: schema.loungePosts.kind,
      parentId: schema.loungePosts.parentId,
      createdAt: schema.loungePosts.createdAt,
      authorName: schema.users.displayName,
    })
    .from(schema.loungePosts)
    .innerJoin(schema.users, eq(schema.loungePosts.authorId, schema.users.id))
    .orderBy(desc(schema.loungePosts.createdAt))
    .limit(200);
  return NextResponse.json({ posts: rows, self: user.displayName });
}

export async function POST(req: NextRequest) {
  const user = await requireLounge();
  if (!user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.body ?? "").slice(0, 4000).trim();
  if (!text) return NextResponse.json({ reason: "empty" }, { status: 400 });
  const [row] = await getDb()
    .insert(schema.loungePosts)
    .values({
      authorId: user.id,
      body: text,
      kind: body.kind === "debrief" ? "debrief" : "post",
      parentId: typeof body.parentId === "string" ? body.parentId : null,
    })
    .returning({ id: schema.loungePosts.id });
  return NextResponse.json({ ok: true, id: row.id });
}
