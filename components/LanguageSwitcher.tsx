"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    // Path is always /{locale}/... — swap the first segment.
    const parts = pathname.split("/");
    parts[1] = next;
    router.push(parts.join("/") || `/${next}`);
  }

  return (
    <select
      aria-label="Language / ބަސް"
      value={locale}
      onChange={(e) => switchTo(e.target.value)}
      style={{ width: "auto" }}
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {l === "dv" ? "ދިވެހި" : "English"}
        </option>
      ))}
    </select>
  );
}
