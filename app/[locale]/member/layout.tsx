import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import HelplineCorner from "@/components/HelplineCorner";

// Every member screen renders inside this layout, so the 1677/119 corner is
// always visible (Hard Rule 3).
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await requireRole("member");
  if (!user) redirect(`/${locale}/login`);
  return (
    <>
      {children}
      <HelplineCorner />
    </>
  );
}
