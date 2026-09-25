// Text normalization shared by the data pipeline (scripts/data) and runtime
// search, so indexes and queries are always normalized the same way.

// Harakat, Quranic annotation marks, superscript alef and tatweel.
const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const ARABIC_LETTER = /[ء-يٮ-ۓۺ-ۿ]/;

export function hasArabic(text: string): boolean {
  return ARABIC_LETTER.test(text);
}

/** Letter-level normalization for Arabic: strips diacritics and folds
 *  spelling variants that are routinely interchanged in hadith texts. */
export function normalizeArabic(text: string): string {
  return text
    .replace(ARABIC_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[‌-‏‪-‮]/g, "");
}

/** Tokens of Arabic words only (punctuation and Latin removed). */
export function arabicTokens(text: string): string[] {
  return normalizeArabic(text)
    .replace(/[^ء-ي\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Latin normalization: lowercase, strip accents and the many apostrophe
 *  variants used for ʿayn/hamza, unify common name particles. */
export function normalizeLatin(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[ʿʾ'`´‘’ʼ"]/g, "")
    .replace(/\bibn\b|\bb\.\s?/g, "bin ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function latinTokens(text: string): string[] {
  return normalizeLatin(text).split(" ").filter(Boolean);
}

/** Normalizes free text of either script into a single searchable string. */
export function normalizeForSearch(text: string): string {
  const ar = arabicTokens(text).join(" ");
  const la = latinTokens(text.replace(/[؀-ۿ]+/g, " ")).join(" ");
  return [ar, la].filter(Boolean).join(" ");
}

/** Collapses runs of whitespace, including the wide gaps in the English
 *  source texts. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function wordBigrams(tokens: string[]): Set<string> {
  const out = new Set<string>();
  if (tokens.length === 1) out.add(tokens[0]);
  for (let i = 0; i + 1 < tokens.length; i++) out.add(tokens[i] + " " + tokens[i + 1]);
  return out;
}
