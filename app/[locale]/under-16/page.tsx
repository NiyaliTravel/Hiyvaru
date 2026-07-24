import { useTranslations } from "next-intl";

// SAFETY (Hard Rule 1): rejected under-16 signups land here.
// Helplines 1484 and 1677, tap-to-call. Keep the tone warm, never punitive.
export default function Under16Page() {
  const t = useTranslations("under16");
  return (
    <main className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>{t("title")}</h1>
        <p>{t("body")}</p>
        <a className="btn block" href="tel:1484">{t("line1484")}</a>
        <a className="btn block secondary" href="tel:1677" style={{ marginTop: 10 }}>
          {t("line1677")}
        </a>
        <p>{t("closing")}</p>
      </div>
    </main>
  );
}
