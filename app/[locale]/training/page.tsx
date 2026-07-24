"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type Module = {
  slug: string;
  title: string;
  body: string[];
  quiz: Array<{ q: string; options: string[] }>;
};
type Status = { slug: string; title: string; completed: boolean };

export default function TrainingPage() {
  const t = useTranslations("training");
  const tc = useTranslations("common");
  const [modules, setModules] = useState<Module[]>([]);
  const [status, setStatus] = useState<Status[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<Record<string, "passed" | "failed">>({});
  const [allDone, setAllDone] = useState(false);

  async function load() {
    const d = await fetch("/api/training").then((r) => r.json());
    setModules(d.modules ?? []);
    setStatus(d.status ?? []);
    setAllDone((d.status ?? []).every((s: Status) => s.completed));
  }
  useEffect(() => {
    load();
  }, []);

  async function submitQuiz(slug: string) {
    const res = await fetch("/api/training", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ moduleSlug: slug, answers: answers[slug] ?? [] }),
    });
    const d = await res.json();
    setResult((r) => ({ ...r, [slug]: d.passed ? "passed" : "failed" }));
    if (d.passed) load();
    if (d.allComplete) setAllDone(true);
  }

  const doneCount = status.filter((s) => s.completed).length;

  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">{tc("appName")}</span>
        <LanguageSwitcher />
      </div>
      <h1>{t("title")}</h1>
      <p className="hint">{t("progress", { done: doneCount, total: status.length })}</p>
      {allDone && <div className="card" style={{ background: "#f0fdf4" }}>{t("allDone")}</div>}

      {modules.map((m) => {
        const st = status.find((s) => s.slug === m.slug);
        const isOpen = open === m.slug;
        return (
          <div className="card" key={m.slug}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>
                {m.title} {st?.completed && "✓"}
              </h3>
              <button className="btn secondary" style={{ padding: "6px 12px" }} onClick={() => setOpen(isOpen ? null : m.slug)}>
                {t("start")}
              </button>
            </div>
            {isOpen && (
              <>
                {m.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <h4>{t("quiz")}</h4>
                <p className="hint">{t("quizNote")}</p>
                {m.quiz.map((q, qi) => (
                  <div key={qi} style={{ marginBlock: 10 }}>
                    <strong>{q.q}</strong>
                    {q.options.map((opt, oi) => (
                      <label key={oi} style={{ fontWeight: 400 }}>
                        <input
                          type="radio"
                          name={`${m.slug}-${qi}`}
                          checked={(answers[m.slug] ?? [])[qi] === oi}
                          onChange={() =>
                            setAnswers((a) => {
                              const arr = [...(a[m.slug] ?? [])];
                              arr[qi] = oi;
                              return { ...a, [m.slug]: arr };
                            })
                          }
                          style={{ width: "auto", marginInlineEnd: 8 }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ))}
                {result[m.slug] === "failed" && <p className="error">{t("failed")}</p>}
                {result[m.slug] === "passed" && <p style={{ color: "green" }}>{t("passed")}</p>}
                <button
                  className="btn"
                  disabled={(answers[m.slug] ?? []).filter((x) => x !== undefined).length !== m.quiz.length}
                  onClick={() => submitQuiz(m.slug)}
                >
                  {t("submitQuiz")}
                </button>
              </>
            )}
          </div>
        );
      })}
    </main>
  );
}
