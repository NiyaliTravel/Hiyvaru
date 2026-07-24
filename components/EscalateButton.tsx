"use client";

import { useTranslations } from "next-intl";

// SAFETY (Hard Rule 3): the Escalate button lives in every listener chat.
export default function EscalateButton({ conversationId }: { conversationId: string }) {
  const t = useTranslations("crisis");
  async function escalate() {
    if (!window.confirm(t("escalateConfirm"))) return;
    await fetch(`/api/chat/${conversationId}/escalate`, { method: "POST" });
    // The server emits conv:crisis to both screens; no client state needed here.
  }
  return (
    <button className="btn danger" style={{ padding: "8px 14px" }} onClick={escalate}>
      {t("escalate")}
    </button>
  );
}
