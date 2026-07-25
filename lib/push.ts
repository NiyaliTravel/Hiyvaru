import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Web push (env-gated by VAPID keys). Notification content is ALWAYS generic —
// never chat content, never names — a locked phone screen must reveal nothing.
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails("mailto:admin@hiyvaru.mv", pub, priv);
  const db = getDb();
  const subs = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId));
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription as never, JSON.stringify(payload));
    } catch {
      // stale subscription — remove it
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
    }
  }
}
