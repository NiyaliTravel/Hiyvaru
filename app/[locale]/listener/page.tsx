import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";

export default async function ListenerHome() {
  const locale = await getLocale();
  const user = await requireRole("listener");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("nav");
  return (
    <main className="container">
      <div className="card">
        <h1>{t("listener")}</h1>
        <p dir="ltr">{user.displayName}</p>
        {/* Listener dashboard arrives in Phase B/C */}
      </div>
    </main>
  );
}
