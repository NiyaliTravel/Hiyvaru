import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

// Calm — a small, curated self-help library. Full content in U4; the four
// cards and their exercises are live here.
const CARDS = [
  { slug: "breathe", cls: "calm-1", title: "breatheTitle", desc: "breatheDesc" },
  { slug: "ground", cls: "calm-2", title: "groundTitle", desc: "groundDesc" },
  { slug: "overwhelm", cls: "calm-5", title: "overwhelmTitle", desc: "overwhelmDesc" },
  { slug: "sleep", cls: "calm-3", title: "sleepTitle", desc: "sleepDesc" },
  { slug: "lonely", cls: "calm-4", title: "lonelyTitle", desc: "lonelyDesc" },
  { slug: "kindness", cls: "calm-6", title: "kindnessTitle", desc: "kindnessDesc" },
] as const;

export default async function CalmPage() {
  const t = await getTranslations("calm");
  const locale = await getLocale();
  return (
    <main>
      <h1 className="greeting">{t("title")}</h1>
      <p className="greeting-sub">{t("intro")}</p>
      <div className="calm-grid">
        {CARDS.map((c) => (
          <Link key={c.slug} className={`calm-card ${c.cls}`} href={`/${locale}/member/calm/${c.slug}`}>
            <h3>{t(c.title)}</h3>
            <p>{t(c.desc)}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
