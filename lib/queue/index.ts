import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { attemptMatch, timeOutStale } from "@/lib/chat/matching";
import { emitToUser } from "@/lib/socket/registry";

// Queue driver: BullMQ when REDIS_URL is set (production), plain interval
// in-process otherwise (dev machines without Redis). Both run the same sweep.

const SWEEP_MS = 3000;
const WAIT_TIMEOUT_MS = 120_000;

export async function runMatchSweep(): Promise<void> {
  // 1) time out members who waited too long
  for (const memberId of await timeOutStale(WAIT_TIMEOUT_MS)) {
    emitToUser(memberId, "match:timeout", {});
  }
  // 2) try to match every waiting entry, oldest first
  const waiting = await getDb()
    .select({ id: schema.matchQueue.id })
    .from(schema.matchQueue)
    .where(eq(schema.matchQueue.status, "waiting"))
    .orderBy(schema.matchQueue.createdAt);
  for (const entry of waiting) {
    const result = await attemptMatch(entry.id);
    if (result.matched) {
      emitToUser(result.memberId, "match:found", { conversationId: result.conversationId });
      emitToUser(result.listenerId, "match:assigned", { conversationId: result.conversationId });
    }
  }
}

let started = false;

export async function startMatchWorker(): Promise<void> {
  if (started) return;
  started = true;

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const { Queue, Worker } = await import("bullmq");
    const connection = { url: redisUrl } as never;
    const queue = new Queue("match", { connection });
    new Worker("match", async () => runMatchSweep(), { connection });
    await queue.upsertJobScheduler("match-sweep", { every: SWEEP_MS });
    console.log("[queue] BullMQ match worker started");
  } else {
    setInterval(() => {
      runMatchSweep().catch((e) => console.error("[queue] sweep failed", e));
    }, SWEEP_MS);
    console.log("[queue] in-process match worker started (no REDIS_URL)");
  }
}
