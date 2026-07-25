import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function YouPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const user = (await getSessionUser())!;

  return (
    <main>
      <div className="profile-head">
        <span className="avatar" aria-hidden="true">{user.displayName.slice(0, 2).toUpperCase()}</span>
        <div className="p-name" dir="ltr">{user.displayName}</div>
        <p className="hint">{t("you.anonNote")}</p>
      </div>

      <div className="card">
        <div className="row-list">
          <div className="row-item">
            <span className="ri-label">{t("you.language")}</span>
            <LanguageSwitcher />
          </div>
          <Link className="row-item" href={`/${locale}/apply`}>
            <span className="ri-label">{t("you.becomeListener")}</span>
            <span className="ri-value" aria-hidden="true">→</span>
          </Link>
          <Link className="row-item" href={`/${locale}/terms`}>
            <span className="ri-label">{t("you.help")}</span>
            <span className="ri-value" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <LogoutButton label={t("you.logout")} />
      </div>
    </main>
  );
}
