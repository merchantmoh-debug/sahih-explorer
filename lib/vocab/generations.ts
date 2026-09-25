// Generations (tabaqat) as numbered by Ibn Hajar in Taqrib al-Tahdhib, and
// the broader classes the source data files narrators under.
import type { L10n } from "./grades";

export type NarratorClass =
  | "prophet"
  | "companion"
  | "successor"
  | "successor2"
  | "later"
  | "relative"
  | "unknown";

export type Madhhab = "shafii" | "hanafi" | "maliki" | "hanbali" | "other";

export interface ParsedGeneration {
  cls: NarratorClass;
  generation: number | null;
  century: number | null;
  madhhab: Madhhab | null;
  nonMuslim: boolean;
}

export const CLASS_LABELS: Record<NarratorClass, L10n> = {
  prophet: { en: "The Messenger of Allah ﷺ", ar: "رسول الله ﷺ", ckb: "پێغەمبەری خوا ﷺ" },
  companion: { en: "Companion (Sahabi)", ar: "صحابي", ckb: "هاوەڵ (سەحابی)" },
  successor: { en: "Successor (Tabi'i)", ar: "تابعي", ckb: "تابیعی" },
  successor2: { en: "Follower of the Successors", ar: "من أتباع التابعين", ckb: "شوێنکەوتووی تابیعییەکان" },
  later: { en: "Later scholar", ar: "من المتأخرين عن أتباع التابعين", ckb: "زانای دواتر" },
  relative: { en: "Relative of the Prophet ﷺ", ar: "من أقارب النبي ﷺ", ckb: "خزمی پێغەمبەر ﷺ" },
  unknown: { en: "Unclassified", ar: "غير مصنف", ckb: "پۆلێن نەکراو" },
};

/** Ibn Hajar's twelve generations. */
export const GENERATIONS: Record<number, { label: L10n; note: L10n }> = {
  1: { label: { en: "Companions", ar: "الصحابة", ckb: "هاوەڵان" }, note: { en: "The Companions of the Prophet ﷺ.", ar: "صحابة النبي ﷺ.", ckb: "هاوەڵانی پێغەمبەر ﷺ." } },
  2: { label: { en: "Senior Successors", ar: "كبار التابعين", ckb: "تابیعییە گەورەکان" }, note: { en: "E.g. Sa'id ibn al-Musayyib.", ar: "كسعيد بن المسيب.", ckb: "وەک سەعیدی کوڕی موسەییەب." } },
  3: { label: { en: "Middle Successors", ar: "الطبقة الوسطى من التابعين", ckb: "تابیعییە ناوەندییەکان" }, note: { en: "E.g. al-Hasan al-Basri and Ibn Sirin.", ar: "كالحسن البصري وابن سيرين.", ckb: "وەک حەسەنی بەسری و ئیبن سیرین." } },
  4: { label: { en: "Successors after them", ar: "طبقة تليها من التابعين", ckb: "تابیعییەکانی دوای ئەوان" }, note: { en: "Mostly narrate from senior Successors, e.g. al-Zuhri and Qatada.", ar: "جل روايتهم عن كبار التابعين كالزهري وقتادة.", ckb: "زۆربەی گێڕانەوەیان لە تابیعییە گەورەکانەوەیە، وەک زوهری و قەتادە." } },
  5: { label: { en: "Junior Successors", ar: "صغار التابعين", ckb: "تابیعییە بچووکەکان" }, note: { en: "Saw one or two Companions, e.g. al-A'mash.", ar: "رأوا الواحد والاثنين من الصحابة كالأعمش.", ckb: "یەک یان دوو هاوەڵیان بینیوە، وەک ئەعمەش." } },
  6: { label: { en: "Contemporaries of the 5th", ar: "عاصروا الخامسة", ckb: "هاوچەرخانی پێنجەم" }, note: { en: "Contemporaries of the fifth generation with no established meeting with a Companion, e.g. Ibn Jurayj.", ar: "عاصروا الخامسة ولم يثبت لهم لقاء أحد من الصحابة كابن جريج.", ckb: "هاوچەرخی پێنجەمن بەڵام دیداریان لەگەڵ هاوەڵ نەسەلمێنراوە، وەک ئیبن جوڕەیج." } },
  7: { label: { en: "Senior Followers of the Successors", ar: "كبار أتباع التابعين", ckb: "شوێنکەوتووە گەورەکانی تابیعییەکان" }, note: { en: "E.g. Malik and Sufyan al-Thawri.", ar: "كمالك والثوري.", ckb: "وەک مالیک و سوفیانی سەوری." } },
  8: { label: { en: "Middle Followers of the Successors", ar: "الوسطى من أتباع التابعين", ckb: "شوێنکەوتووە ناوەندییەکانی تابیعییەکان" }, note: { en: "E.g. Sufyan ibn 'Uyayna and Ibn 'Ulayya.", ar: "كابن عيينة وابن علية.", ckb: "وەک ئیبن عویەینە و ئیبن عولەییە." } },
  9: { label: { en: "Junior Followers of the Successors", ar: "صغار أتباع التابعين", ckb: "شوێنکەوتووە بچووکەکانی تابیعییەکان" }, note: { en: "E.g. Yazid ibn Harun, al-Shafi'i and 'Abd al-Razzaq.", ar: "كيزيد بن هارون والشافعي وعبد الرزاق.", ckb: "وەک یەزیدی کوڕی هارون و شافیعی و عەبدولڕەززاق." } },
  10: { label: { en: "Senior students of the 9th", ar: "كبار الآخذين عن تبع الأتباع", ckb: "قوتابییە گەورەکانی نۆیەم" }, note: { en: "Took from the Followers of the Successors without meeting a Successor, e.g. Ahmad ibn Hanbal.", ar: "ممن لم يلق التابعين كأحمد بن حنبل.", ckb: "وەرگرتوون لە شوێنکەوتووان بێ ئەوەی تابیعی ببینن، وەک ئەحمەدی کوڕی حەنبەڵ." } },
  11: { label: { en: "Middle students of the 9th", ar: "الوسطى من الآخذين عن تبع الأتباع", ckb: "قوتابییە ناوەندییەکانی نۆیەم" }, note: { en: "E.g. al-Dhuhli and al-Bukhari.", ar: "كالذهلي والبخاري.", ckb: "وەک زوهلی و بوخاری." } },
  12: { label: { en: "Junior students of the 9th", ar: "صغار الآخذين عن تبع الأتباع", ckb: "قوتابییە بچووکەکانی نۆیەم" }, note: { en: "E.g. al-Tirmidhi.", ar: "كالترمذي.", ckb: "وەک تیرمیزی." } },
};

export const MADHHAB_LABELS: Record<Madhhab, L10n> = {
  shafii: { en: "Shafi'i", ar: "شافعي", ckb: "شافیعی" },
  hanafi: { en: "Hanafi", ar: "حنفي", ckb: "حەنەفی" },
  maliki: { en: "Maliki", ar: "مالكي", ckb: "مالیکی" },
  hanbali: { en: "Hanbali", ar: "حنبلي", ckb: "حەنبەلی" },
  other: { en: "Other school", ar: "مذهب آخر", ckb: "مەزهەبی تر" },
};

export function parseGeneration(raw: string | null | undefined): ParsedGeneration {
  const s = (raw ?? "").trim();
  const res: ParsedGeneration = { cls: "unknown", generation: null, century: null, madhhab: null, nonMuslim: false };
  if (/^Rasool Allah/i.test(s)) res.cls = "prophet";
  else if (/^Comp\./i.test(s)) res.cls = "companion";
  else if (/^Follower\(Tabi'\)/i.test(s)) res.cls = "successor";
  else if (/^Succ\./i.test(s)) res.cls = "successor2";
  else if (/Century AH/i.test(s)) {
    res.cls = "later";
    const c = s.match(/(\d+)(?:st|nd|rd|th) Century AH/i);
    if (c) res.century = Number(c[1]);
  } else if (/Prophet's Relative/i.test(s)) res.cls = "relative";

  const g = s.match(/\[(\d+)(?:st|nd|rd|th) generation\]/i);
  if (g) {
    const n = Number(g[1]);
    if (n >= 1 && n <= 12) res.generation = n;
  }
  // Companions are the first generation by definition; the source files a
  // few under later numbers, which would distort chronology checks.
  if (res.cls === "companion") res.generation = 1;

  if (/\[Shafi'ee\]/i.test(s)) res.madhhab = "shafii";
  else if (/\[Hanafi\]/i.test(s)) res.madhhab = "hanafi";
  else if (/\[Maliki\]/i.test(s)) res.madhhab = "maliki";
  else if (/\[Hanbali\]/i.test(s)) res.madhhab = "hanbali";
  else if (/\[Other\]/i.test(s)) res.madhhab = "other";
  res.nonMuslim = /\[Non-Muslim\]/i.test(s);
  return res;
}
