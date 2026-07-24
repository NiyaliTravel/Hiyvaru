import { getTranslations } from "next-intl/server";

// Placeholder — the full application flow (ID upload, training, quiz) ships in
// Phase C. Public page: applicants are not yet listeners.
export default async function ListenerApplyPage() {
  const t = await getTranslations("landing");
  return (
    <main className="container">
      <div className="card">
        <h1>{t("becomeListener")}</h1>
        <p className="hint">Coming soon.</p>
      </div>
    </main>
  );
}
