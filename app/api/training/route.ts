import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { TRAINING_MODULES } from "@/lib/training/content";
import { submitQuiz, trainingStatus } from "@/lib/training/service";

async function isApplicantOrListener(userId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ userId: schema.listenerProfiles.userId })
    .from(schema.listenerProfiles)
    .where(eq(schema.listenerProfiles.userId, userId))
    .limit(1);
  return rows.length > 0;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || !(await isApplicantOrListener(user.id))) {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const status = await trainingStatus(user.id);
  // Quiz answers stay server-side; clients get questions + options only.
  const modules = TRAINING_MODULES.map((m) => ({
    slug: m.slug,
    title: m.title,
    body: m.body,
    quiz: m.quiz.map((q) => ({ q: q.q, options: q.options })),
  }));
  return NextResponse.json({ modules, status });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !(await isApplicantOrListener(user.id))) {
    return NextResponse.json({ reason: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await submitQuiz(
    user.id,
    String(body.moduleSlug ?? ""),
    Array.isArray(body.answers) ? body.answers.map(Number) : [],
  );
  if (!result.ok) return NextResponse.json({ reason: "bad_module" }, { status: 400 });
  return NextResponse.json(result);
}
