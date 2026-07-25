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
      </section>

      {/* Two doors — get support vs give support */}
      <section className="doors">
        <div className="door door-primary">
          <h2>{t("landing.talkDoorTitle")}</h2>
          <p>{t("landing.talkDoorDesc")}</p>
          <Link className="btn block" href={`/${locale}/signup`}>
            {t("landing.talkDoorCta")}
          </Link>
        </div>
        <div className="door door-secondary">
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
