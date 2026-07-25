import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { getOngoingListeners, greetingKey } from "@/lib/member";
import MoodCheckIn from "@/components/MoodCheckIn";

export const dynamic = "force-dynamic";

export default async function MemberHome() {
  const t = await getTranslations();
  const locale = await getLocale();
  const user = (await getSessionUser())!;
  const ongoing = await getOngoingListeners(user.id);
  const greeting = t(`home.greeting${greetingKey()}`);

  return (
    <main>
      <h1 className="greeting">{greeting}</h1>
      <p className="greeting-sub">
        <span dir="ltr">{user.displayName}</span>
      </p>

      <MoodCheckIn />

      <Link className="big-action" href={`/${locale}/member/talk`}>
        <span className="ba-ico" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.6A8.4 8.4 0 1 1 21 11.5z" />
          </svg>
        </span>
        <span className="ba-title">{t("home.talkTitle")}</span>
        <span className="ba-sub">{t("home.talkSub")}</span>
      </Link>

      <p className="section-label">{t("home.yourListeners")}</p>
      {ongoing.length === 0 ? (
        <div className="card">
          <p className="hint" style={{ margin: 0 }}>{t("home.noListeners")}</p>
        </div>
      ) : (
        <div className="card">
          {ongoing.map((l) => (
            <div className="listener-row" key={l.id}>
              <span className="avatar" aria-hidden="true">{l.displayName.slice(0, 2).toUpperCase()}</span>
              <span style={{ flex: 1 }}>
                <span className="lr-name" dir="ltr">{l.displayName}</span>
                <br />
                <span className="lr-meta">
                  {l.online ? (
                    <><span className="online-dot" />{t("home.onlineNow")}</>
                  ) : (
                    t("home.offline")
                  )}
                </span>
              </span>
              <Link className="btn secondary" style={{ padding: "8px 16px" }} href={`/${locale}/member/talk`}>
                {t("tabs.talk")}
              </Link>
            </div>
          ))}
        </div>
      )}

      <p className="hint" style={{ textAlign: "center", marginTop: 20 }}>{t("common.listenerNote")}</p>
    </main>
  );
}
