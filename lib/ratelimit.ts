import { NextRequest } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Simple fixed-window in-memory rate limiter (single-process deployment).
// Keys live on globalThis so Next route bundles and the custom server share
// one store. For multi-instance deployments move this to Redis.

type Window = { count: number; resetAt: number };
const g = globalThis as unknown as { __hiyvaruRl?: Map<string, Window> };
const store = (g.__hiyvaruRl ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const w = store.get(key);
  if (!w || w.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (w.count >= limit) return false;
  w.count++;
  return true;
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local"
  );
}

/**
 * New-account throttle (spec §3.3): accounts younger than 24h are capped at
 * 5 chat requests per day (abuse brake, spec leaves the number open).
 */
export async function newAccountChatAllowed(userId: string, createdAt: Date): Promise<boolean> {
  const isNew = Date.now() - createdAt.getTime() < 24 * 3600_000;
  if (!isNew) return true;
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.conversations)
    .where(and(eq(schema.conversations.memberId, userId), gt(schema.conversations.startedAt, dayAgo)));
  return row.n < 5;
}
