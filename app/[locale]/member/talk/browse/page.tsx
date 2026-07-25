"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

type BrowseListener = {
  id: string;
  displayName: string;
  bio: string | null;
  lang: "dv" | "en" | "both";
  level: "probation" | "full" | "mentor";
  topics: string[];
  online: boolean;
  favourite: boolean;
};

const TOPICS = ["stress", "anxiety", "family", "relationships", "work", "study", "grief", "loneliness", "faith", "identity"];

export default function BrowseListeners() {
  const t = useTranslations("browse");
  const tt = useTranslations("topics");
  const locale = useLocale();
  const router = useRouter();

  const [langF, setLangF] = useState<"" | "dv" | "en">("");
  const [onlineF, setOnlineF] = useState(false);
  const [topicF, setTopicF] = useState("");
  const [listeners, setListeners] = useState<BrowseListener[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (langF) p.set("lang", langF);
    if (onlineF) p.set("online", "1");
    if (topicF) p.set("topic", topicF);
    return p.toString();
  }, [langF, onlineF, topicF]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/listeners?${query}`)
      .then((r) => r.json())
      .then((d) => setListeners(d.listeners ?? []))
      .finally(() => setLoading(false));
  }, [query]);

  function talkTo(id: string) {
    router.push(`/${locale}/member/talk/now?listener=${id}`);
  }
  function clearFilters() {
    setLangF("");
    setOnlineF(false);
    setTopicF("");
  }

  return (
    <main>
      <h1 className="greeting">{t("title")}</h1>
      <p className="greeting-sub">{t("intro")}</p>

      {/* Filters */}
      <div className="chip-row" style={{ marginBottom: 10 }}>
        <button className={`filter-chip${onlineF ? " on" : ""}`} onClick={() => setOnlineF((v) => !v)} type="button">
          ● {t("filterOnline")}
        </button>
        <button className={`filter-chip${langF === "dv" ? " on" : ""}`} onClick={() => setLangF((v) => (v === "dv" ? "" : "dv"))} type="button">
          {t("filterDv")}
        </button>
        <button className={`filter-chip${langF === "en" ? " on" : ""}`} onClick={() => setLangF((v) => (v === "en" ? "" : "en"))} type="button">
          {t("filterEn")}
        </button>
      </div>
      <div className="topic-scroll">
        <button className={`filter-chip${topicF === "" ? " on" : ""}`} onClick={() => setTopicF("")} type="button">
          {t("topicAny")}
        </button>
        {TOPICS.map((tp) => (
          <button key={tp} className={`filter-chip${topicF === tp ? " on" : ""}`} onClick={() => setTopicF(tp)} type="button">
            {tt(tp)}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="card"><p className="hint" style={{ margin: 0 }}>…</p></div>
      ) : listeners.length === 0 ? (
        <div className="card">
          <p>{t("empty")}</p>
          <button className="btn secondary" onClick={clearFilters}>{t("clear")}</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {listeners.map((l) => (
            <article className="lcard" key={l.id}>
              <div className="lcard-head">
                <span className="avatar" aria-hidden="true">{l.displayName.slice(0, 2).toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="lcard-name">
                    <span dir="ltr">{l.displayName}</span>
                    {l.favourite && <span className="mini-badge kept">{t("favourite")}</span>}
                    {l.level === "mentor" && <span className="mini-badge mentor">{t("mentor")}</span>}
                  </div>
                  <div className="lcard-meta">
                    <span className={l.online ? "on" : "off"}>
                      {l.online ? <><span className="online-dot" />{t("online")}</> : t("offline")}
                    </span>
                    {" · "}
                    {t("speaks")}: {l.lang === "both" ? "Dhivehi / English" : l.lang === "dv" ? "Dhivehi" : "English"}
                  </div>
                </div>
              </div>
              {l.bio && <p className="lcard-bio">{l.bio}</p>}
              {l.topics.length > 0 && (
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {l.topics.map((tp) => (
                    <span key={tp} className="topic-tag">{tt(tp)}</span>
                  ))}
                </div>
              )}
              <button
                className={`btn ${l.online ? "" : "secondary"}`}
                style={{ marginTop: 12, width: "100%" }}
                disabled={!l.online}
                onClick={() => talkTo(l.id)}
              >
                {l.online ? t("talk") : t("offline")}
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
