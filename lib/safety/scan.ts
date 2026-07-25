import { getExplicitLexicon, getRiskLexicon } from "./lexicons";

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — message scanning (Hard Rules 3 & 6).
// Runs on the plaintext at send time (before encryption). Two scans:
//  - risk terms  -> soft banner to listener + moderator notification
//  - contact info -> grooming defence warning to BOTH parties
// Scanning never blocks the message; humans decide.
// ---------------------------------------------------------------------------

// Phone numbers (Maldivian 7-digit mobiles, international formats) and social
// handles / platform names commonly used to move chats off-platform.
const CONTACT_PATTERNS: RegExp[] = [
  /\+?\d[\d\s\-]{5,14}\d/,                 // phone-number-looking digit runs (7+ digits, incl. bare Maldivian mobiles)
  /@[a-z0-9_.]{3,}/i,                      // @handles
  /\b(insta|instagram|telegram|viber|whatsapp|snapchat|snap|tiktok|facebook|fb|signal)\b/i,
  /\b(vaiber|watsapp)\b/i,                  // common misspellings
];

export type ScanResult = {
  riskTerms: string[];
  contactInfo: boolean;
  explicitTerms: string[];
};

export async function scanMessage(text: string): Promise<ScanResult> {
  const lower = text.toLowerCase();
  const lexicon = await getRiskLexicon();
  const riskTerms = lexicon.filter((term) => lower.includes(term.toLowerCase()));
  const contactInfo = CONTACT_PATTERNS.some((re) => re.test(text));
  const explicit = await getExplicitLexicon();
  const explicitTerms = explicit.filter((term) => lower.includes(term.toLowerCase()));
  return { riskTerms, contactInfo, explicitTerms };
}

// ---------------------------------------------------------------------------
// SAFETY-CRITICAL — outgoing message gate (founder rules 2026-07-25):
//  - explicit/sexual content is NEVER delivered, either direction
//  - contact information is NEVER delivered, either direction
// Risk terms are NOT blocked (a member disclosing suicidal thoughts must
// always get through) — they trigger the listener banner + moderator log.
// ---------------------------------------------------------------------------
export type GateResult =
  | { allow: true; scan: ScanResult }
  | { allow: false; reason: "explicit" | "contact_info"; scan: ScanResult };

export async function checkOutgoingMessage(text: string): Promise<GateResult> {
  const scan = await scanMessage(text);
  if (scan.explicitTerms.length > 0) return { allow: false, reason: "explicit", scan };
  if (scan.contactInfo) return { allow: false, reason: "contact_info", scan };
  return { allow: true, scan };
}
