import { NextRequest, NextResponse } from "next/server";
import { desc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { decideApplication, getApplicationImages } from "@/lib/listener/application";

async function requireAdmin() {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}

/** List pending applications; with ?userId= returns decrypted images for review. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const userId = req.nextUrl.searchParams.get("userId");
  if (userId) {
    // SAFETY: ID images decrypt ONLY here, only for admin, for side-by-side review.
    const images = await getApplicationImages(userId);
    return NextResponse.json({ images });
  }
  const rows = await getDb()
    .select({
      userId: schema.listenerProfiles.userId,
      docType: schema.listenerProfiles.docType,
      docExpiry: schema.listenerProfiles.docExpiry,
      bio: schema.listenerProfiles.bio,
      createdAt: schema.listenerProfiles.createdAt,
      displayName: schema.users.displayName,
      trainingCompletedAt: schema.listenerProfiles.trainingCompletedAt,
    })
    .from(schema.listenerProfiles)
    .innerJoin(schema.users, eq(schema.listenerProfiles.userId, schema.users.id))
    .where(isNull(schema.listenerProfiles.verifiedAt))
    .orderBy(desc(schema.listenerProfiles.createdAt));
  // Only applications that still have uploaded docs are decidable.
  const withDocs = [];
  for (const row of rows) {
    const docs = await getDb()
      .select({ id: schema.idDocuments.id })
      .from(schema.idDocuments)
      .where(eq(schema.idDocuments.userId, row.userId));
    if (docs.length > 0) withDocs.push(row);
  }
  return NextResponse.json({ applications: withDocs });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const result = await decideApplication({
    adminId: admin.id,
    userId: String(body.userId ?? ""),
    approve: !!body.approve,
    note: typeof body.note === "string" ? body.note : undefined,
  });
  if (!result.ok) return NextResponse.json({ reason: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, purgedDocs: result.purgedDocs });
}
