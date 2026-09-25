// Locale helpers for data vocabulary and narrator names.
import type { Honorific, NarratorSummary } from "./data/types";
import type { L10n, Locale } from "./vocab/grades";

export type { Locale };
export const LOCALES: Locale[] = ["en", "ar", "ckb"];

export function isRtl(locale: string): boolean {
  return locale === "ar" || locale === "ckb";
}

export function pick(value: L10n, locale: string): string {
  return value[(locale as Locale)] ?? value.en;
}

/** Name in the script the reader expects: Arabic script for ar/ckb. */
export function displayName(n: Pick<NarratorSummary, "en" | "ar">, locale: string): string {
  if (isRtl(locale)) return n.ar || n.en;
  return n.en || n.ar;
}

/** The other script's form, shown as a secondary line. */
export function secondaryName(n: Pick<NarratorSummary, "en" | "ar">, locale: string): string | null {
  const other = isRtl(locale) ? n.en : n.ar;
  return other && other !== displayName(n, locale) ? other : null;
}

export const HONORIFIC_TEXT: Record<Exclude<Honorific, null>, string> = {
  saw: "ﷺ",
  ra: "رضي الله عنه",
  raha: "رضي الله عنها",
  as: "عليه السلام",
};

// Digits are converted here rather than left to Intl: runtimes disagree on
// Kurdish (Node formats "ckb" with Eastern Arabic digits, Chrome falls back to
// Western ones), and client components must render the same text on the
// server and in the browser. Arabic uses Western digits, as CLDR now does.
const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function localizeDigits(s: string, locale: string): string {
  if (locale !== "ckb") return s;
  return s.replace(/[0-9]/g, (d) => EASTERN_DIGITS[Number(d)]).replace(/,/g, "٬").replace(/\./g, "٫");
}

export function formatNumber(n: number, locale: string): string {
  return localizeDigits(new Intl.NumberFormat("en-US").format(n), locale);
}

/** A year, generation or book number: the locale's digits, no grouping. */
export function formatPlain(n: number, locale: string): string {
  return localizeDigits(String(n), locale);
}

export function localePath(locale: string, path: string): string {
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}
