import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import HelplineCorner from "@/components/HelplineCorner";
import { getPublicStats } from "@/lib/stats";

export const dynamic = "force-dynamic"; // live listener counts

export default async function Landing() {
  const t = await getTranslations();
  const locale = await getLocale();
  const stats = await getPublicStats();
  return (
    <main className="container landing">
      <div className="topbar">
        <span className="brand">{t("common.appName")}</span>
        <LanguageSwitcher />
      </div>

      {/* Hero */}
      <section className="hero">
        <h1>{t("landing.heroTitle")}</h1>
        <p className="hero-sub">{t("landing.heroSub")}</p>
        <div className="stats-strip">
          <span className="stat">
            <strong>{stats.listenersOnboard}</strong> {t("common.listeners")}
          </span>
          <span className={`stat ${stats.listenersOnline > 0 ? "online" : "offline"}`}>
            ● {t("landing.statsOnline", { count: stats.listenersOnline })}
          </span>
          <span className="stat muted">{t("landing.statsMembers", { count: stats.members })}</span>
        </div>
        {/* calm layered waves — Maldives ocean, on-brand & reassuring */}
        <svg className="hero-waves" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true">
          <path fill="var(--teal)" opacity="0.18" d="M0 60 C240 110 480 20 720 50 C960 80 1200 130 1440 70 L1440 140 L0 140 Z" />
          <path fill="var(--teal)" opacity="0.28" d="M0 90 C240 60 480 120 720 95 C960 70 1200 40 1440 95 L1440 140 L0 140 Z" />
          <path fill="var(--teal)" opacity="0.9" d="M0 115 C240 95 480 135 720 118 C960 101 1200 120 1440 110 L1440 140 L0 140 Z" />
        </svg>
      </section>

      {/* Two doors — get support vs give support */}
      <section className="doors">
        <div className="door door-primary">
          <div className="door-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9 8.38 8.38 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5z" />
            </svg>
          </div>
          <h2>{t("landing.talkDoorTitle")}</h2>
          <p>{t("landing.talkDoorDesc")}</p>
          <Link className="btn block" href={`/${locale}/signup`}>
            {t("landing.talkDoorCta")}
          </Link>
        </div>
        <div className="door door-secondary">
          <div className="door-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </div>
          <h2>{t("landing.helpDoorTitle")}</h2>
          <p>{t("landing.helpDoorDesc")}</p>
          <Link className="btn block secondary" href={`/${locale}/apply`}>
            {t("landing.helpDoorCta")}
          </Link>
        </div>
      </section>

      <p className="returning">
        {t("landing.returning")} <Link href={`/${locale}/login`}>{t("landing.login")}</Link>
      </p>

      {/* Trust row */}
      <section className="card trust">
        <ul>
          <li>{t("landing.how1")}</li>
          <li>{t("landing.how2")}</li>
          <li>{t("landing.how3")}</li>
        </ul>
        <p className="hint">{t("common.listenerNote")}</p>
      </section>

      <p className="safety-line">{t("landing.safetyLine")}</p>

      <p className="hint footer-links">
        <Link href={`/${locale}/terms`}>{t("legal.terms")}</Link>
        {" · "}
        <Link href={`/${locale}/privacy`}>{t("legal.privacy")}</Link>
      </p>

      <HelplineCorner />
    </main>
  );
}
