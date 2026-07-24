"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ReportButton({ conversationId }: { conversationId: string }) {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, reason }),
    });
    if (res.ok) {
      setSent(true);
      setOpen(false);
    }
  }

  if (sent) return <span className="hint">{t("reportSent")}</span>;
  return (
    <>
      <button className="btn secondary" style={{ padding: "8px 14px" }} onClick={() => setOpen(!open)}>
        {t("report")}
      </button>
      {open && (
        <div style={{ width: "100%" }}>
          <p className="hint">{t("reportPrompt")}</p>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn" style={{ marginTop: 6 }} disabled={!reason.trim()} onClick={submit}>
            {t("submit")}
          </button>
        </div>
      )}
    </>
  );
}
