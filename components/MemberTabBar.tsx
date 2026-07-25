"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

// Persistent app navigation: bottom tab bar on mobile, left sidebar on web.
// Four calm tabs (research: fewer is better for people in distress).
const TABS = [
  { key: "home", href: "", icon: HomeIcon },
  { key: "talk", href: "/talk", icon: ChatIcon },
  { key: "calm", href: "/calm", icon: LeafIcon },
  { key: "you", href: "/you", icon: UserIcon },
] as const;

export default function MemberTabBar() {
  const t = useTranslations("tabs");
  const locale = useLocale();
  const pathname = usePathname();
  const base = `/${locale}/member`;

  function isActive(href: string): boolean {
    const full = `${base}${href}`;
    if (href === "") return pathname === base || pathname === `${base}/`;
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  return (
    <nav className="tabbar" aria-label="Main">
      <span className="tabbar-brand">ހިޔްވަރު</span>
      {TABS.map(({ key, href, icon: Icon }) => (
        <Link
          key={key}
          href={`${base}${href}`}
          className="tab"
          aria-current={isActive(href) ? "page" : undefined}
        >
          <span className="tab-ico" aria-hidden="true"><Icon /></span>
          <span>{t(key)}</span>
        </Link>
      ))}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l1.9-5.6A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}
function LeafIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c-1.6 3.2-5.2 4.2-5.2 8.3A5.2 5.2 0 0 0 12 16.5a5.2 5.2 0 0 0 5.2-5.2C17.2 7.2 13.6 6.2 12 3z" /><path d="M12 16.5V21" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}
