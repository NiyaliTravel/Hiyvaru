import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import HelplineCorner from "@/components/HelplineCorner";
import MemberTabBar from "@/components/MemberTabBar";

// The app shell for every member screen: persistent tab bar (mobile) / sidebar
// (web), the helpline pill (Hard Rule 3), and the routed content.
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await requireRole("member");
  if (!user) redirect(`/${locale}/login`);
  const t = await getTranslations("a11y");
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t("skipToContent")}</a>
      <MemberTabBar />
      <div className="app-main" id="main-content" tabIndex={-1}>{children}</div>
      <HelplineCorner raised />
    </div>
  );
}
