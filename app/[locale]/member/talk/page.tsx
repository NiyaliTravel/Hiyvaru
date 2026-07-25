import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

// Talk tab — choose how to connect (7 Cups model: instant match OR browse).
// Browse is stubbed to instant in U1; the real browse ships in U2.
export default async function TalkChoice() {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <main>
      <h1 className="greeting">{t("talkTab.title")}</h1>
      <div className="choice" style={{ marginTop: 18 }}>
        <Link className="choice-card primary" href={`/${locale}/member/talk/now`}>
          <span className="cc-ico" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.6A8.4 8.4 0 1 1 21 11.5z" />
            </svg>
          </span>
          <span>
            <h3>{t("talkTab.instantTitle")}</h3>
            <p>{t("talkTab.instantSub")}</p>
          </span>
        </Link>

        <Link className="choice-card secondary" href={`/${locale}/member/talk/browse`}>
          <span className="cc-ico" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <span>
            <h3>{t("talkTab.browseTitle")}</h3>
            <p>{t("talkTab.browseSub")}</p>
          </span>
        </Link>
      </div>
    </main>
  );
}
