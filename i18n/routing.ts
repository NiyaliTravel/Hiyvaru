import { defineRouting } from "next-intl/routing";

// Dhivehi-first: dv is the default locale. dv renders RTL (Thaana).
export const routing = defineRouting({
  locales: ["dv", "en"],
  defaultLocale: "dv",
});

export type AppLocale = (typeof routing.locales)[number];

export function dirFor(locale: string): "rtl" | "ltr" {
  return locale === "dv" ? "rtl" : "ltr";
}
