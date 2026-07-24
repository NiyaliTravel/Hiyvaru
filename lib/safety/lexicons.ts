import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — risk keyword lexicons (spec §3.3).
// Seed lists below are editable at runtime via the `config` table (admin UI).
// The Dhivehi list MUST be reviewed and extended with a psychologist before
// pilot (see NEEDS_MOHAMED.md). Matching is case-insensitive substring for
// Thaana (no casing) and word-ish boundaries for Latin.
// ---------------------------------------------------------------------------

export const DEFAULT_RISK_LEXICON_EN = [
  "kill myself",
  "suicide",
  "suicidal",
  "end my life",
  "want to die",
  "wanna die",
  "self harm",
  "self-harm",
  "hurt myself",
  "cut myself",
  "overdose",
  "no reason to live",
  "better off dead",
  "end it all",
];

export const DEFAULT_RISK_LEXICON_DV = [
  "އަމިއްލައަށް މަރުވާން",     // to kill myself
  "މަރުވާން ބޭނުން",           // want to die
  "މަރުވެއްޖެއްޔާ ރަނގަޅު",    // better if I died
  "ދިރިހުރުމުގެ ބޭނުމެއް ނެތް", // no point in living
  "އަމިއްލަ ނަފްސަށް ގެއްލުން", // harm to my own self
  "ސުއިސައިޑް",               // suicide (loanword)
];

export type Lexicons = { risk: string[]; };

const CONFIG_KEY = "risk_lexicons";

export async function getRiskLexicon(): Promise<string[]> {
  const rows = await getDb()
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, CONFIG_KEY))
    .limit(1);
  if (rows.length > 0) {
    const v = rows[0].value as { en?: string[]; dv?: string[] };
    return [...(v.en ?? []), ...(v.dv ?? [])];
  }
  return [...DEFAULT_RISK_LEXICON_EN, ...DEFAULT_RISK_LEXICON_DV];
}

/** Seed the editable config row if absent (called from seed script). */
export async function seedLexicons(): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(schema.config).where(eq(schema.config.key, CONFIG_KEY)).limit(1);
  if (rows.length === 0) {
    await db.insert(schema.config).values({
      key: CONFIG_KEY,
      value: { en: DEFAULT_RISK_LEXICON_EN, dv: DEFAULT_RISK_LEXICON_DV },
    });
  }
}
