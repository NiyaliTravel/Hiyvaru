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
    <main className="container">
      <div className="topbar">
        <span className="brand">{t("common.appName")}</span>
        <LanguageSwitcher />
      </div>
      <div className="card">
        <h1>{t("common.tagline")}</h1>
        <p style={{ display: "flex", gap: 14, flexWrap: "wrap", fontWeight: 600 }}>
          <span>{t("landing.statsListeners", { count: stats.listenersOnboard })}</span>
          <span style={{ color: stats.listenersOnline > 0 ? "var(--teal-dark)" : "var(--muted)" }}>
            ● {t("landing.statsOnline", { count: stats.listenersOnline })}
          </span>
          <span className="hint" style={{ fontWeight: 400 }}>
            {t("landing.statsMembers", { count: stats.members })}
          </span>
        </p>
        <ul>
          <li>{t("landing.how1")}</li>
          <li>{t("landing.how2")}</li>
          <li>{t("landing.how3")}</li>
        </ul>
        <p className="hint">{t("common.listenerNote")}</p>
        <Link className="btn block" href={`/${locale}/signup`}>
          {t("landing.signup")}
        </Link>
        <p style={{ textAlign: "center" }}>
          <Link href={`/${locale}/login`}>{t("landing.login")}</Link>
          {" · "}
          <Link href={`/${locale}/apply`}>{t("landing.becomeListener")}</Link>
        </p>
        <p className="hint" style={{ textAlign: "center" }}>
          <Link href={`/${locale}/terms`}>{t("legal.terms")}</Link>
          {" · "}
          <Link href={`/${locale}/privacy`}>{t("legal.privacy")}</Link>
        </p>
      </div>
      <HelplineCorner />
    </main>
  );
}
