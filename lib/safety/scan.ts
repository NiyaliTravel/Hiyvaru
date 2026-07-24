import { getRiskLexicon } from "./lexicons";

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
  /\+?\d[\d\s\-]{6,14}\d/,                 // phone-number-looking digit runs
  /@[a-z0-9_.]{3,}/i,                      // @handles
  /\b(insta|instagram|telegram|viber|whatsapp|snapchat|snap|tiktok|facebook|fb|signal)\b/i,
  /\b(vaiber|watsapp)\b/i,                  // common misspellings
];

export type ScanResult = {
  riskTerms: string[];
  contactInfo: boolean;
};

export async function scanMessage(text: string): Promise<ScanResult> {
  const lower = text.toLowerCase();
  const lexicon = await getRiskLexicon();
  const riskTerms = lexicon.filter((term) => lower.includes(term.toLowerCase()));
  const contactInfo = CONTACT_PATTERNS.some((re) => re.test(text));
  return { riskTerms, contactInfo };
}
