import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { TRAINING_MODULES, getModule } from "./content";
import { audit } from "@/lib/audit";

// SAFETY-CRITICAL — training gate (Hard Rule 2 companion). A quiz submission
// sets the module complete ONLY at 100%. training_completed_at is set ONLY
// when every module is complete. The matcher requires it.

export async function submitQuiz(
  userId: string,
  moduleSlug: string,
  answers: number[],
): Promise<{ ok: boolean; score: number; passed: boolean; allComplete: boolean }> {
  const mod = getModule(moduleSlug);
  if (!mod) return { ok: false, score: 0, passed: false, allComplete: false };
  const total = mod.quiz.length;
  let correct = 0;
  mod.quiz.forEach((q, i) => {
    if (answers[i] === q.answer) correct++;
  });
  const score = Math.round((correct / total) * 100);
  const passed = score === 100;

  const db = getDb();
  const existing = await db
    .select()
    .from(schema.trainingProgress)
    .where(
      and(eq(schema.trainingProgress.userId, userId), eq(schema.trainingProgress.moduleSlug, moduleSlug)),
    )
    .limit(1);
  if (existing.length === 0) {
    await db.insert(schema.trainingProgress).values({
      userId,
      moduleSlug,
      quizScore: score,
      completedAt: passed ? new Date() : null,
    });
  } else if (!existing[0].completedAt) {
    await db
      .update(schema.trainingProgress)
      .set({ quizScore: score, completedAt: passed ? new Date() : null })
      .where(eq(schema.trainingProgress.id, existing[0].id));
  }

  const done = await db
    .select()
    .from(schema.trainingProgress)
    .where(eq(schema.trainingProgress.userId, userId));
  const completedSlugs = new Set(done.filter((d) => d.completedAt).map((d) => d.moduleSlug));
  const allComplete = TRAINING_MODULES.every((m) => completedSlugs.has(m.slug));

  if (allComplete) {
    await db
      .update(schema.listenerProfiles)
      .set({ trainingCompletedAt: new Date() })
      .where(eq(schema.listenerProfiles.userId, userId));
    await audit({
      actorId: userId,
      action: "training_completed",
      subjectType: "user",
      subjectId: userId,
    });
  }
  return { ok: true, score, passed, allComplete };
}

export async function trainingStatus(userId: string) {
  const done = await getDb()
    .select()
    .from(schema.trainingProgress)
    .where(eq(schema.trainingProgress.userId, userId));
  const completed = new Set(done.filter((d) => d.completedAt).map((d) => d.moduleSlug));
  return TRAINING_MODULES.map((m) => ({
    slug: m.slug,
    title: m.title,
    completed: completed.has(m.slug),
  }));
}
