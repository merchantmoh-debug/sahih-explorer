import { arabicTokens, hasArabic } from "../../../lib/text/normalize";
import type { Honorific } from "../../../lib/data/types";

export interface ParsedName {
  en: string;
  ar: string;
  /** Longer Arabic form when the source lists alternatives ("X - Y"). */
  arFull: string;
  honorific: Honorific;
}

const SALAWAT = /(?:صل[ىیي]|صلّی)\s*(?:اللہ|الله)\s*(?:علیہ|عليه)\s*(?:وآلہ\s*|وآله\s*)?(?:وسلّم|وسلم)/g;
const RADI = /ر[ضص][يى]\s*الله\s*(?:تعالى\s*)?(عنهما|عنهم|عنها|عنه)/g;
const ALAYHI_SALAM = /عليه(?:ا|م)?\s*السلام/g;
const RAHIMAHU = /رحمه(?:ا|م)?\s*الله/g;

function cleanArabic(s: string): string {
  return s
    .replace(/[‎‏‪-‮]/g, "")
    .replace(/[()]/g, " ")
    .replace(/\s*-\s*$/g, "")
    .replace(/^[\s,،\-–]+|[\s,،\-–]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLatin(s: string): string {
  return s
    .replace(/\(\s*(saw|pbuh|ra|as)\s*\)/gi, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,\-]+|[\s,\-]+$/g, "")
    .trim();
}

export function parseName(raw: string, id: string): ParsedName {
  if (id === "1") {
    return { en: "Prophet Muhammad", ar: "محمد رسول الله", arFull: "محمد رسول الله", honorific: "saw" };
  }
  const text = raw ?? "";
  let honorific: Honorific = null;
  const first = text.search(/[؀-ۿ]/);
  const latinPart = first < 0 ? text : text.slice(0, first);
  let arabicPart = first < 0 ? "" : text.slice(first);

  const radi = [...arabicPart.matchAll(RADI)];
  if (radi.length) honorific = radi[radi.length - 1][1] === "عنها" ? "raha" : "ra";
  else if (ALAYHI_SALAM.test(arabicPart)) honorific = "as";
  ALAYHI_SALAM.lastIndex = 0;

  arabicPart = arabicPart
    .replace(RADI, " ")
    .replace(ALAYHI_SALAM, " ")
    .replace(RAHIMAHU, " ")
    // Salawat inside a name refers to the Prophet (e.g. "son of the
    // Messenger of Allah"); keep it, in its standard symbol.
    .replace(SALAWAT, " ﷺ ");

  const arFull = cleanArabic(arabicPart);
  const ar = cleanArabic(arFull.split(/\s[-–]\s|,|،/)[0] ?? arFull) || arFull;
  let en = cleanLatin(latinPart);
  if (!en && !hasArabic(text)) en = cleanLatin(text);
  return { en: en || ar, ar, arFull: arFull !== ar ? arFull : ar, honorific };
}

// Kunya particles fold into the next word so that "عبد الله" or "أبو هريرة"
// count as one distinctive token. "ابن X" is left apart: texts say
// "ابن بريدة" for a narrator the source names "... بن بريدة".
const JOINERS = new Set(["عبد", "ابو", "ابي", "ابا", "ام"]);
const STOP = new Set(["بن", "ابن", "بنت", "ﷺ", "رسول"]);

/** Texts write "ليث" for "الليث", "ابن عباس" for "... العباس". */
export function foldArticle(unit: string): string {
  return unit.length > 4 && unit.startsWith("ال") && unit !== "الله" ? unit.slice(2) : unit;
}

export function nameUnits(text: string): string[] {
  const toks = arabicTokens(text);
  const out: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    let t = toks[i];
    if (JOINERS.has(t) && i + 1 < toks.length) {
      const head = t === "ابي" || t === "ابا" ? "ابو" : t;
      t = head + foldArticle(toks[++i]);
    }
    out.push(foldArticle(t));
  }
  return out;
}

export function nameTokenSet(text: string): Set<string> {
  return new Set(nameUnits(text).filter((t) => !STOP.has(t) && t.length > 1));
}

/** Key for grouping people who may be cited by the same name, e.g. every
 *  "Muhammad ibn 'Abdullah": first name plus father's name. */
export function sameNameKey(ar: string): string | null {
  const units = nameUnits(ar).filter((t) => t !== "ﷺ");
  if (!units.length) return null;
  if (units.length >= 3 && (units[1] === "بن" || units[1] === "بنت")) return `${units[0]} بن ${units[2]}`;
  return units[0];
}
