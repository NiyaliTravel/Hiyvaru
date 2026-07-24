"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export default function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const locale = useLocale();
  return (
    <button
      className="btn secondary"
      style={{ padding: "8px 14px" }}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push(`/${locale}`);
      }}
    >
      {label}
    </button>
  );
}
