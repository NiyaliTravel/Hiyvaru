import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

// Browse Listeners — full experience ships in U2. For now, explain and offer
// the instant match so the path is never a dead end.
export default async function BrowseStub() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <main>
      <h1 className="greeting">{t("talkTab.browseTitle")}</h1>
      <div className="card">
        <p>{t("talkTab.browseSoon")}</p>
        <Link className="btn block" href={`/${locale}/member/talk/now`} style={{ marginTop: 12 }}>
          {t("talkTab.instantTitle")}
        </Link>
      </div>
    </main>
  );
}
