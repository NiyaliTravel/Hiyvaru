"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ApplyPage() {
  const t = useTranslations("apply");
  const tc = useTranslations("common");
  const tt = useTranslations("topics");
  const locale = useLocale();
  const TOPICS = ["stress", "anxiety", "family", "relationships", "work", "study", "grief", "loneliness", "faith", "identity"];
  const [topics, setTopics] = useState<string[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [docType, setDocType] = useState<"national_id" | "passport">("national_id");
  const [docExpiry, setDocExpiry] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => setLoggedIn(r.ok));
  }, []);

  async function submit() {
    if (!idFile || !selfieFile || !docExpiry) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          docType,
          docExpiry,
          idImageBase64: await fileToBase64(idFile),
          idImageMime: idFile.type,
          selfieBase64: await fileToBase64(selfieFile),
          selfieMime: selfieFile.type,
          bio,
          topics,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.reason ?? "error");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">{tc("appName")}</span>
        <LanguageSwitcher />
      </div>
      <div className="card">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
        <p className="hint">{t("privacyNote")}</p>

        {loggedIn === false && (
          <p>
            <Link className="btn block" href={`/${locale}/signup`}>{t("loginFirst")}</Link>
          </p>
        )}

        {loggedIn && !done && (
          <>
            <label>{t("docType")}</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value as never)}>
              <option value="national_id">{t("nationalId")}</option>
              <option value="passport">{t("passport")}</option>
            </select>
            <label>{t("docExpiry")}</label>
            <input dir="ltr" type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} />
            <label>{t("idImage")}</label>
            <input type="file" accept="image/*" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
            <label>{t("selfie")}</label>
            <input type="file" accept="image/*" capture="user" onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} />
            <label>{t("topics")}</label>
            <p className="hint">{t("topicsHint")}</p>
            <div className="chip-row">
              {TOPICS.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  className={`filter-chip${topics.includes(tp) ? " on" : ""}`}
                  onClick={() =>
                    setTopics((cur) => (cur.includes(tp) ? cur.filter((x) => x !== tp) : [...cur, tp]))
                  }
                >
                  {tt(tp)}
                </button>
              ))}
            </div>
            <label>{t("bio")}</label>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            {error && <p className="error">{error}</p>}
            <button
              className="btn block"
              style={{ marginTop: 14 }}
              disabled={busy || !idFile || !selfieFile || !docExpiry}
              onClick={submit}
            >
              {t("submit")}
            </button>
          </>
        )}

        {done && (
          <>
            <p>{t("submitted")}</p>
            <Link className="btn block" href={`/${locale}/training`}>
              {tc("continue")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
