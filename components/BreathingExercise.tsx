"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// A 4-4-6 breathing pace with a synced orb. Respects reduced-motion (the orb
// still scales via CSS, which we disable globally under the media query).
const PHASES = [
  { key: "in", ms: 4000, scale: 1.15 },
  { key: "hold", ms: 4000, scale: 1.15 },
  { key: "out", ms: 6000, scale: 0.8 },
] as const;

export default function BreathingExercise() {
  const t = useTranslations("calm.content.breathe");
  const [i, setI] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setI((n) => (n + 1) % PHASES.length), PHASES[i].ms);
    return () => clearTimeout(timer);
  }, [i]);

  const phase = PHASES[i];
  return (
    <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
      <p className="hint">{t("lead")}</p>
      <div
        aria-hidden="true"
        style={{
          width: 150,
          height: 150,
          margin: "26px auto",
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--teal-soft), var(--teal))",
          transform: `scale(${phase.scale})`,
          transition: `transform ${phase.ms}ms ease-in-out`,
        }}
      />
      <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", color: "var(--teal-dark)", margin: 0 }} role="status">
        {t(phase.key)}
      </p>
    </div>
  );
}
