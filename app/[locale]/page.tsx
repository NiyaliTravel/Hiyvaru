import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import HelplineCorner from "@/components/HelplineCorner";

export default function Landing() {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">{t("common.appName")}</span>
        <LanguageSwitcher />
      </div>
      <div className="card">
        <h1>{t("common.tagline")}</h1>
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
