import { getDb, schema } from "@/lib/db";

/** Append-only audit trail for every safety-relevant action. */
export async function audit(entry: {
  actorId?: string | null;
  action: string;
  subjectType?: string;
  subjectId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await getDb().insert(schema.auditLog).values({
    actorId: entry.actorId ?? null,
    action: entry.action,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId,
    detail: entry.detail,
  });
}
