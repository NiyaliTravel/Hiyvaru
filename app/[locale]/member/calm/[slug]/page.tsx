import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import BreathingExercise from "@/components/BreathingExercise";

const SLUGS = ["breathe", "ground", "sleep", "lonely", "overwhelm", "kindness"] as const;
type Slug = (typeof SLUGS)[number];
const TITLE_KEY: Record<Slug, string> = {
  breathe: "breatheTitle",
  ground: "groundTitle",
  sleep: "sleepTitle",
  lonely: "lonelyTitle",
  overwhelm: "overwhelmTitle",
  kindness: "kindnessTitle",
};

export default async function CalmExercise({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUGS.includes(slug as Slug)) notFound();
  const s = slug as Slug;
  const t = await getTranslations("calm");
  const locale = await getLocale();

  return (
    <main>
      <p style={{ marginBottom: 6 }}>
        <Link href={`/${locale}/member/calm`}>← {t("back")}</Link>
      </p>
      <h1 className="greeting">{t(TITLE_KEY[s])}</h1>

      {s === "breathe" ? (
        <BreathingExercise />
      ) : (
        <div className="card">
          <p style={{ marginTop: 0 }}>{t(`content.${s}.lead`)}</p>
          <ol style={{ paddingInlineStart: 20, margin: 0, display: "grid", gap: 10 }}>
            {(t.raw(`content.${s}.steps`) as string[]).map((step, idx) => (
              <li key={idx} style={{ lineHeight: 1.5 }}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
