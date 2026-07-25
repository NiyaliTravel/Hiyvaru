import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import HelplineCorner from "@/components/HelplineCorner";
import MemberTabBar from "@/components/MemberTabBar";

// The app shell for every member screen: persistent tab bar (mobile) / sidebar
// (web), the helpline pill (Hard Rule 3), and the routed content.
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await requireRole("member");
  if (!user) redirect(`/${locale}/login`);
  return (
    <div className="app-shell">
      <MemberTabBar />
      <div className="app-main">{children}</div>
      <HelplineCorner raised />
    </div>
  );
}
