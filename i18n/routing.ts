import { defineRouting } from "next-intl/routing";

// English is the default UI language (founder decision 2026-07-24: nearly all
// Maldivians read English; Dhivehi remains one tap away in the switcher and
// renders RTL Thaana). Chat-language matching still supports dv fully.
export const routing = defineRouting({
  locales: ["en", "dv"],
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];

export function dirFor(locale: string): "rtl" | "ltr" {
  return locale === "dv" ? "rtl" : "ltr";
}
