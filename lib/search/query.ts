// Query parsing shared by the API, the search page and tests. Pure: no data
// access here.
import type { CollectionSlug } from "../collections";
import { arabicTokens, hasArabic, latinTokens, normalizeArabic } from "../text/normalize";

const ALIASES: Record<CollectionSlug, string[]> = {
  bukhari: ["bukhari", "al bukhari", "albukhari", "sahih bukhari", "sahih al bukhari", "البخاري", "بخاري", "صحيح البخاري", "بوخاري", "بوخاری", "سەحیحی بوخاری"],
  muslim: ["muslim", "sahih muslim", "مسلم", "صحيح مسلم", "موسليم", "موسلیم", "سەحیحی موسلیم"],
  abudawud: ["abu dawud", "abudawud", "abu daud", "abi dawud", "abi daud", "sunan abi dawud", "ابو داود", "ابي داود", "سنن ابي داود", "ئەبی داود"],
  tirmidhi: ["tirmidhi", "tirmizi", "at tirmidhi", "al tirmidhi", "jami al tirmidhi", "الترمذي", "ترمذي", "جامع الترمذي", "تیرمیزی"],
  nasai: ["nasai", "an nasai", "al nasai", "sunan an nasai", "النسائي", "نسائي", "سنن النسائي", "نەسائی"],
  ibnmajah: ["ibn majah", "ibnmajah", "ibn maja", "sunan ibn majah", "ابن ماجه", "ابن ماجة", "سنن ابن ماجه", "ئیبن ماجە"],
};

function normAlias(s: string): string {
  return hasArabic(s) ? normalizeArabic(s).replace(/\s+/g, " ").trim() : latinTokens(s).join(" ");
}

const ALIAS_LIST: [string, CollectionSlug][] = Object.entries(ALIASES)
  .flatMap(([slug, list]) => list.map((a) => [normAlias(a), slug as CollectionSlug] as [string, CollectionSlug]))
  .sort((a, b) => b[0].length - a[0].length);

export interface ReferenceQuery {
  collection: CollectionSlug;
  number: string;
}

/** "bukhari 1", "Muslim 1907a", "البخاري ٥٢", "abu dawud #2201" */
export function parseReference(input: string): ReferenceQuery | null {
  const q = input
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[#:،,]/g, " ")
    .toLowerCase();
  const m = q.match(/^(.*?)[\s]*(\d{1,5}[a-z]?)$/);
  if (!m) return null;
  const name = normAlias(m[1]);
  if (!name) return null;
  const hit = ALIAS_LIST.find(([alias]) => alias === name);
  return hit ? { collection: hit[1], number: m[2] } : null;
}

// Attached conjunctions, prepositions and the article: "وبالنيات" should
// find "النيات". Matching is by substring, so suffixes need no stripping.
const AR_PREFIXES = ["وبال", "فبال", "وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ك", "ل"];

export function stripArabicPrefix(token: string): string {
  for (const p of AR_PREFIXES) {
    if (token.startsWith(p) && token.length - p.length >= 3) return token.slice(p.length);
  }
  return token;
}

/** Tokens to match against normalized search text. Names keep their
 *  particles ("بلال" is a name, not "ب" + "لال"). */
export function queryTokens(input: string, { stripPrefixes = true }: { stripPrefixes?: boolean } = {}): string[] {
  const ar = arabicTokens(input).map((t) => (stripPrefixes ? stripArabicPrefix(t) : t));
  const la = latinTokens(input.replace(/[؀-ۿ]+/g, " "));
  return [...new Set([...ar, ...la])].filter((t) => t.length > 1 || /\d/.test(t));
}
