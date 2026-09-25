// Small text helpers of the data build, kept separate for testing.
import { collapseWhitespace } from "../../../lib/text/normalize";

/** Hadith API arabicnumber for Muslim → Abd al-Baqi reference, e.g. 1907.01 → "1907a". */
export function muslimRef(an: number | string | null | undefined): string | null {
  if (an === null || an === undefined || an === "") return null;
  const v = typeof an === "number" ? an : Number(an);
  if (!Number.isFinite(v) || v <= 0) return null;
  const whole = Math.floor(v + 1e-9);
  const frac = Math.round((v - whole) * 100);
  if (frac <= 0) return String(whole);
  return frac <= 26 ? `${whole}${String.fromCharCode(96 + frac)}` : String(whole);
}

export function splitTitle(chapter: string): { en: string; ar: string } {
  const i = chapter.search(/\s-\s(?=[^\sA-Za-z])/);
  if (i < 0) return { en: chapter, ar: "" };
  return { en: chapter.slice(0, i).trim(), ar: chapter.slice(i + 3).trim() };
}

export const GARBLED = /\[Haylulah|\[Chain:|Narrated to us|\[Translation needed/;

export function cleanEnglish(text: string | null | undefined): string | null {
  const t = collapseWhitespace(text ?? "");
  if (!t || GARBLED.test(t) || /[ء-ي]{3,}/.test(t)) return null;
  return t;
}

export function snippet(text: string, max = 180): string {
  const t = collapseWhitespace(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)) + "…";
}
