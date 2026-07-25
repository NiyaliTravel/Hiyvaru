"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Gentle, optional check-in. Not persisted in U1 — it exists to make Home feel
// human and to acknowledge the person. No pressure, no streaks, no judgement.
const MOODS = [
  { key: "moodLow", face: "😞" },
  { key: "moodDown", face: "😔" },
  { key: "moodOkay", face: "😐" },
  { key: "moodGood", face: "🙂" },
  { key: "moodGreat", face: "😊" },
] as const;

export default function MoodCheckIn() {
  const t = useTranslations("home");
  const [picked, setPicked] = useState<string | null>(null);

  if (picked) {
    return (
      <div className="card" role="status">
        <p style={{ margin: 0 }}>{t("moodThanks")}</p>
      </div>
    );
  }
  return (
    <div className="card">
      <p className="section-label" style={{ margin: "0 0 10px" }}>{t("howAreYou")}</p>
      <div className="moods">
        {MOODS.map((m) => (
          <button key={m.key} className="mood" onClick={() => setPicked(m.key)} type="button">
            <span className="m-face" aria-hidden="true">{m.face}</span>
            {t(m.key)}
          </button>
        ))}
      </div>
    </div>
  );
}
