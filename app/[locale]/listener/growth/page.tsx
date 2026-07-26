"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

type Badge = { slug: string; earned: boolean; progress: number };
type Growth = {
  level: "applicant" | "probation" | "full" | "mentor";
  chatsSupported: number;
  probationChatsLeft: number;
  averageStars: number | null;
  ratingsCount: number;
  badges: Badge[];
  cheers: Array<{ id: string; note: string | null; from: string; at: string }>;
};

const BADGE_KEY: Record<string, string> = {
  trained: "badgeTrained",
  verified: "badgeVerified",
  firstChat: "badgeFirstChat",
  tenChats: "badgeTenChats",
  fiftyChats: "badgeFiftyChats",
  hundredChats: "badgeHundredChats",
  mentor: "badgeMentor",
};

export default function GrowthPage() {
  const t = useTranslations("growth");
  const locale = useLocale();
  const [g, setG] = useState<Growth | null>(null);

  useEffect(() => {
    fetch("/api/listener/growth").then((r) => (r.ok ? r.json() : null)).then(setG);
  }, []);

  const levelLabel = g
    ? t(`level${g.level.charAt(0).toUpperCase()}${g.level.slice(1)}` as never)
    : "";

  return (
    <main className="container">
      <p style={{ marginBottom: 6 }}>
        <Link href={`/${locale}/listener`}>← {t("title")}</Link>
      </p>
      <h1 className="greeting">{t("title")}</h1>
      <p className="greeting-sub">{t("intro")}</p>

      {!g ? (
        <div className="card"><p className="hint" style={{ margin: 0 }}>…</p></div>
      ) : (
        <>
          <div className="growth-hero">
            <span className="g-level">{levelLabel}</span>
            <div className="g-stats">
              <div>
                <span className="g-num">{g.chatsSupported}</span>
                <span className="g-lbl">{t("chatsSupported")}</span>
              </div>
              <div>
                <span className="g-num">
                  {g.averageStars ? `${g.averageStars.toFixed(1)}★` : "—"}
                </span>
                <span className="g-lbl">
                  {g.ratingsCount > 0 ? t("rating") : t("noRating")}
                </span>
              </div>
            </div>
          </div>

          {g.level === "probation" && (
            <div className="card" style={{ borderColor: "var(--teal)" }}>
              <p style={{ margin: 0 }}>
                {g.probationChatsLeft > 0
                  ? t("probationProgress", { left: g.probationChatsLeft })
                  : t("probationDone")}
              </p>
              <div className="progress-track" style={{ marginTop: 10 }}>
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round(((10 - g.probationChatsLeft) / 10) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <p className="section-label">{t("badges")}</p>
          <div className="badge-grid">
            {g.badges.map((b) => (
              <div key={b.slug} className={`badge-tile${b.earned ? " earned" : ""}`}>
                <span className="b-ico" aria-hidden="true">{b.earned ? "★" : "☆"}</span>
                <span className="b-name">{t(BADGE_KEY[b.slug] as never)}</span>
                {!b.earned && <span className="b-locked">{t("locked")}</span>}
              </div>
            ))}
          </div>

          <p className="section-label">{t("cheers")}</p>
          {g.cheers.length === 0 ? (
            <div className="card"><p className="hint" style={{ margin: 0 }}>{t("noCheers")}</p></div>
          ) : (
            g.cheers.map((c) => (
              <div className="card cheer" key={c.id}>
                <p style={{ margin: 0 }}>{c.note}</p>
                <p className="hint" style={{ margin: "6px 0 0" }}>
                  — <span dir="ltr">{c.from}</span>
                </p>
              </div>
            ))
          )}
        </>
      )}
    </main>
  );
}
