"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";

type Post = {
  id: string;
  body: string;
  kind: "post" | "debrief";
  createdAt: string;
  authorName: string;
};

export default function LoungePage() {
  const t = useTranslations("lounge");
  const locale = useLocale();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [debrief, setDebrief] = useState(false);

  async function load() {
    const d = await fetch("/api/lounge").then((r) => r.json());
    setPosts(d.posts ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function post() {
    if (!text.trim()) return;
    await fetch("/api/lounge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: text, kind: debrief ? "debrief" : "post" }),
    });
    setText("");
    setDebrief(false);
    load();
  }

  return (
    <main className="container">
      <div className="topbar">
        <Link className="brand" href={`/${locale}/listener`}>← </Link>
        <h2 style={{ margin: 0 }}>{t("title")}</h2>
      </div>
      <p className="hint">{t("intro")}</p>
      <div className="card">
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("placeholder")} />
        <label style={{ fontWeight: 400 }}>
          <input type="checkbox" checked={debrief} onChange={(e) => setDebrief(e.target.checked)} style={{ width: "auto", marginInlineEnd: 8 }} />
          {t("markDebrief")}
        </label>
        <button className="btn" onClick={post} disabled={!text.trim()}>
          {t("post")}
        </button>
      </div>
      {posts.map((p) => (
        <div className="card" key={p.id} style={p.kind === "debrief" ? { borderColor: "#fdba74" } : undefined}>
          <div className="hint">
            <span dir="ltr">{p.authorName}</span> · {new Date(p.createdAt).toLocaleString()}
            {p.kind === "debrief" && <strong> · {t("debriefTag")}</strong>}
          </div>
          <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{p.body}</p>
        </div>
      ))}
    </main>
  );
}
