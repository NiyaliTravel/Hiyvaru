import { useTranslations } from "next-intl";

// SAFETY (Hard Rule 3): 1677 and 119 are persistently visible in a corner of
// every member-facing screen. Rendered by the member layout — do not remove.
export default function HelplineCorner({ raised = false }: { raised?: boolean }) {
  const t = useTranslations("helplines");
  return (
    <aside className={`helpline-corner${raised ? " raised" : ""}`} aria-label={t("corner")}>
      <div>{t("corner")}</div>
      <a className="h1677" href="tel:1677">{t("helpline1677")}</a>
      <a className="h119" href="tel:119">{t("police119")}</a>
    </aside>
  );
}
