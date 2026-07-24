import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Noto_Sans_Thaana, Inter } from "next/font/google";
import { routing, dirFor } from "@/i18n/routing";
import "../globals.css";

const thaana = Noto_Sans_Thaana({
  subsets: ["thaana"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-thaana",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-latin" });

export const metadata: Metadata = {
  title: "Hiyvaru — ހިޔްވަރު",
  description: "Someone to talk to. Anonymous peer listening for the Maldives.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} dir={dirFor(locale)} className={`${thaana.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
