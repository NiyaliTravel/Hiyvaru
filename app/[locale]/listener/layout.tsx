import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";

export default async function ListenerLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const user = await getSessionUser();
  // The public application form lives at /apply; everything under /listener
  // requires the listener role.
  if (!user || user.role !== "listener") redirect(`/${locale}/login`);
  return <>{children}</>;
}
