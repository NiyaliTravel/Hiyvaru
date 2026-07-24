import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";

export default async function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await requireRole("moderator", "admin");
  if (!user) redirect(`/${locale}/login`);
  return <>{children}</>;
}
