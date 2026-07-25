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

// Explicit/sexual content is BLOCKED outright (founder rule 2026-07-25):
// messages containing these terms are never delivered, in either direction.
// Editable at runtime via the `config` table like the risk lexicon.
export const DEFAULT_EXPLICIT_LEXICON_EN = [
  "porn", "porno", "pornography", "nudes", "nude pic", "send pics", "sext",
  "sexting", "horny", "blowjob", "handjob", "anal", "orgasm", "masturbat",
  "dick pic", "my dick", "my cock", "my pussy", "tits", "boobs", "naked pic",
  "have sex with me", "sex chat", "cybersex", "hookup", "hook up with me",
  "onlyfans",
];

export const DEFAULT_EXPLICIT_LEXICON_DV = [
  "އޮރިޔާން",        // nudity/indecent
  "އޮރިޔާން ފޮޓޯ",   // nude photo
  "ބަރަހަނާ",        // naked
];

export type Lexicons = { risk: string[] };

const CONFIG_KEY = "risk_lexicons";
const EXPLICIT_KEY = "explicit_lexicon";

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

export async function getExplicitLexicon(): Promise<string[]> {
  const rows = await getDb()
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, EXPLICIT_KEY))
    .limit(1);
  if (rows.length > 0) {
    const v = rows[0].value as { en?: string[]; dv?: string[] };
    return [...(v.en ?? []), ...(v.dv ?? [])];
  }
  return [...DEFAULT_EXPLICIT_LEXICON_EN, ...DEFAULT_EXPLICIT_LEXICON_DV];
}

/** Seed the editable config rows if absent (called from seed script). */
export async function seedLexicons(): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(schema.config).where(eq(schema.config.key, CONFIG_KEY)).limit(1);
  if (rows.length === 0) {
    await db.insert(schema.config).values({
      key: CONFIG_KEY,
      value: { en: DEFAULT_RISK_LEXICON_EN, dv: DEFAULT_RISK_LEXICON_DV },
    });
  }
  const exp = await db.select().from(schema.config).where(eq(schema.config.key, EXPLICIT_KEY)).limit(1);
  if (exp.length === 0) {
    await db.insert(schema.config).values({
      key: EXPLICIT_KEY,
      value: { en: DEFAULT_EXPLICIT_LEXICON_EN, dv: DEFAULT_EXPLICIT_LEXICON_DV },
    });
  }
}
