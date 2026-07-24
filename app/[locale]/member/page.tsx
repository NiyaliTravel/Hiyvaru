import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoutButton from "@/components/LogoutButton";

export default async function MemberHome() {
  const t = await getTranslations();
  const locale = await getLocale();
  const user = (await getSessionUser())!;
  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">{t("common.appName")}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LanguageSwitcher />
          <LogoutButton label={t("common.logout")} />
        </div>
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <h1>{t("auth.welcome", { name: user.displayName })}</h1>
        <p className="hint">
          {t("auth.yourName")} <strong dir="ltr">{user.displayName}</strong>
        </p>
        <Link className="btn block" href={`/${locale}/member/talk`}>
          {t("member.talkNow")}
        </Link>
      </div>
      <p className="hint" style={{ textAlign: "center" }}>{t("common.listenerNote")}</p>
    </main>
  );
}
