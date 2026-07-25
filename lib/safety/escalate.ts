import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { audit } from "@/lib/audit";
import { emitToConversation, emitToUser } from "@/lib/socket/registry";

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — crisis escalation (Hard Rule 3, spec §5).
// On trigger:
//   1. member's screen gets the calm crisis card (socket "conv:crisis")
//      with tap-to-call Police 119, Helpline 1677, Police hotline 332 2111
//   2. listener's screen gets the crisis script
//   3. conversation is unlocked for the duty moderator
//   4. duty moderator(s) get a real-time SMS (Twilio; mock mode logs+outbox)
//   5. everything lands in escalations + audit_log
// The chat stays open — the listener does not disappear on the member.
// ---------------------------------------------------------------------------

export type EscalationTrigger = "listener_button" | "keyword_confirmed" | "member_button";

export async function escalateConversation(opts: {
  conversationId: string;
  trigger: EscalationTrigger;
  triggeredBy: string;
}): Promise<{ ok: boolean; escalationId?: string }> {
  const db = getDb();
  const [conv] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, opts.conversationId))
    .limit(1);
  if (!conv || conv.deletedAt) return { ok: false };

  await db
    .update(schema.conversations)
    .set({ escalated: true, moderatorUnlocked: true })
    .where(eq(schema.conversations.id, conv.id));

  const [esc] = await db
    .insert(schema.escalations)
    .values({
      conversationId: conv.id,
      trigger: opts.trigger,
      triggeredBy: opts.triggeredBy,
    })
    .returning({ id: schema.escalations.id });

  // 1+2: both screens react immediately
  emitToConversation(conv.id, "conv:crisis", { escalationId: esc.id });

  // 3+4: duty moderators — realtime socket ping + SMS
  const moderators = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "moderator"));
  for (const m of moderators) {
    emitToUser(m.id, "moderator:crisis", { conversationId: conv.id, escalationId: esc.id });
    // web push (generic body — no content on lock screens)
    const { sendPushToUser } = await import("@/lib/push");
    await sendPushToUser(m.id, {
      title: "Hiyvaru",
      body: "Crisis alert — open the moderator dashboard now.",
      url: "/en/moderator",
    });
  }
  const phones = (process.env.DUTY_MODERATOR_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const phone of phones) {
    // No member-identifying info in the SMS — conversation id only.
    await sendSms(
      phone,
      `HIYVARU CRISIS ALERT: conversation ${conv.id.slice(0, 8)} escalated (${opts.trigger}). Open the moderator dashboard now.`,
    );
  }

  // 5: audit trail
  await audit({
    actorId: opts.triggeredBy,
    action: "crisis_escalation",
    subjectType: "conversation",
    subjectId: conv.id,
    detail: { trigger: opts.trigger, escalationId: esc.id, smsSentTo: phones.length },
  });

  return { ok: true, escalationId: esc.id };
}
