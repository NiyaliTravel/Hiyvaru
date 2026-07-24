import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";

export default async function AdminHome() {
  const locale = await getLocale();
  const user = await requireRole("admin");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("nav");
  return (
    <main className="container">
      <div className="card">
        <h1>{t("admin")}</h1>
        {/* Listener verification dashboard arrives in Phase C */}
      </div>
    </main>
  );
}
