// Narrator reliability labels as recorded in the source data. The wording
// follows the terminology of Ibn Hajar al-Asqalani's Taqrib al-Tahdhib
// (e.g. Maqbul), whose twelve ranks are used here to order the labels.

export type Locale = "en" | "ar" | "ckb";
export type L10n = Record<Locale, string>;

export const GRADE_KEYS = [
  "prophet",
  "companion",
  "no-doubt",
  "thiqah-thiqah",
  "thiqah",
  "sadooq",
  "sadooq-errs",
  "maqbool",
  "majhool",
  "weak",
  "not-thiqah",
  "abandoned",
  "accused-liar",
  "liar",
  "none",
] as const;

export type GradeKey = (typeof GRADE_KEYS)[number];

/** Colour band used on chains and badges. */
export type GradeBand = "prophet" | "top" | "good" | "fair" | "weak" | "severe" | "none";

export interface GradeInfo {
  key: GradeKey;
  /** Approximate rank on Ibn Hajar's 1–12 scale (lower is stronger). */
  rank: number | null;
  band: GradeBand;
  label: L10n;
  /** Arabic term the label stands for. */
  term: string;
  description: L10n;
}

export const GRADES: Record<GradeKey, GradeInfo> = {
  prophet: {
    key: "prophet", rank: null, band: "prophet", term: "ﷺ",
    label: { en: "The Messenger of Allah ﷺ", ar: "رسول الله ﷺ", ckb: "پێغەمبەری خوا ﷺ" },
    description: { en: "The source every chain leads back to.", ar: "المصدر الذي تنتهي إليه الأسانيد.", ckb: "سەرچاوەیەک کە هەموو زنجیرەکان دەگەڕێنەوە بۆی." },
  },
  companion: {
    key: "companion", rank: 1, band: "top", term: "صحابي",
    label: { en: "Companion", ar: "صحابي", ckb: "هاوەڵ" },
    description: {
      en: "Met the Prophet ﷺ as a Muslim and died as one. Hadith scholars do not question the reliability of the Companions.",
      ar: "لقي النبي ﷺ مؤمنًا به ومات على الإسلام. لا يبحث المحدثون في عدالة الصحابة.",
      ckb: "پێغەمبەری ﷺ بینیوە بە باوەڕەوە و لەسەر ئیسلام مردووە. زانایانی فەرموودە لە متمانەی هاوەڵان ناکۆڵنەوە.",
    },
  },
  "no-doubt": {
    key: "no-doubt", rank: 2, band: "top", term: "إمام",
    label: { en: "Leading imam", ar: "إمام", ckb: "ئیمامی پێشەنگ" },
    description: {
      en: "Used in the source for the great imams and compilers, whose reliability is beyond question.",
      ar: "تستعمله البيانات للأئمة الكبار وأصحاب المصنفات الذين لا يُسأل عن مثلهم.",
      ckb: "لە سەرچاوەکەدا بۆ ئیمامە گەورەکان و دانەرانی کتێبەکان بەکاردێت کە متمانەیان جێی گومان نییە.",
    },
  },
  "thiqah-thiqah": {
    key: "thiqah-thiqah", rank: 2, band: "top", term: "ثقة ثقة",
    label: { en: "Highly trustworthy", ar: "ثقة ثقة", ckb: "زۆر متمانەپێکراو" },
    description: {
      en: "Trustworthy with emphasis (e.g. thiqah thabt, thiqah hafiz): the strongest praise short of the imams.",
      ar: "توثيق مؤكد مثل: ثقة ثبت، ثقة حافظ.",
      ckb: "متمانەپێکردنی جەختکراو، وەک: ثقة ثبت، ثقة حافظ.",
    },
  },
  thiqah: {
    key: "thiqah", rank: 3, band: "top", term: "ثقة",
    label: { en: "Trustworthy", ar: "ثقة", ckb: "متمانەپێکراو" },
    description: {
      en: "Upright and precise. Their narrations are accepted on their own.",
      ar: "عدل ضابط، يُحتج بحديثه.",
      ckb: "دادپەروەر و ورد؛ گێڕانەوەکانی بەتەنها وەردەگیرێن.",
    },
  },
  sadooq: {
    key: "sadooq", rank: 4, band: "good", term: "صدوق",
    label: { en: "Truthful", ar: "صدوق", ckb: "ڕاستگۆ" },
    description: {
      en: "Honest, with slightly less precision than 'trustworthy'. Their hadith is generally graded hasan (good).",
      ar: "دون الثقة في الضبط، وحديثه في الغالب حسن.",
      ckb: "ڕاستگۆ، بەڵام وردییەکەی کەمێک لە «متمانەپێکراو» کەمترە؛ فەرموودەکەی زۆربەی جار «حەسەن»ە.",
    },
  },
  "sadooq-errs": {
    key: "sadooq-errs", rank: 5, band: "fair", term: "صدوق يهم",
    label: { en: "Truthful, makes mistakes", ar: "صدوق يهم", ckb: "ڕاستگۆ، هەڵەی هەیە" },
    description: {
      en: "Honest but known for errors (e.g. saduq yahim, lahu awham). Scholars look for corroboration.",
      ar: "صدوق يهم أو له أوهام أو يخطئ؛ يُنظر في متابعاته.",
      ckb: "ڕاستگۆیە بەڵام بە هەڵە ناسراوە؛ زانایان بەدوای پشتگیریدا دەگەڕێن.",
    },
  },
  maqbool: {
    key: "maqbool", rank: 6, band: "fair", term: "مقبول",
    label: { en: "Acceptable", ar: "مقبول", ckb: "وەرگیراو" },
    description: {
      en: "Ibn Hajar's term: acceptable when another narrator corroborates them, otherwise soft (layyin al-hadith).",
      ar: "مصطلح ابن حجر: مقبول حيث يُتابَع، وإلا فلين الحديث.",
      ckb: "زاراوەی ئیبن حەجەر: وەردەگیرێت ئەگەر گێڕەرەوەیەکی تر پشتگیری بکات، ئەگینا لاوازە.",
    },
  },
  majhool: {
    key: "majhool", rank: 7, band: "weak", term: "مجهول",
    label: { en: "Unknown", ar: "مجهول", ckb: "نەناسراو" },
    description: {
      en: "Too little is known about them (majhul, or mastur: identity known, reliability not).",
      ar: "لا تُعرف حاله أو عينه (مجهول، مستور).",
      ckb: "زانیاری کەم لەسەری هەیە (مەجهوول یان مەستوور).",
    },
  },
  weak: {
    key: "weak", rank: 8, band: "weak", term: "ضعيف",
    label: { en: "Weak", ar: "ضعيف", ckb: "لاواز" },
    description: {
      en: "Criticised for poor memory or errors. Their hadith alone is weak, but may be strengthened by other chains.",
      ar: "ضُعّف لسوء حفظه أو كثرة خطئه؛ يتقوى حديثه بالمتابعات والشواهد.",
      ckb: "بەهۆی لاوازی لەبەرکردن یان هەڵە ڕەخنەی لێگیراوە؛ فەرموودەکەی بەتەنها لاوازە.",
    },
  },
  "not-thiqah": {
    key: "not-thiqah", rank: 10, band: "severe", term: "ليس بثقة",
    label: { en: "Not reliable", ar: "ليس بثقة", ckb: "متمانەپێنەکراو" },
    description: {
      en: "Explicitly declared unreliable.",
      ar: "نُصّ على أنه ليس بثقة.",
      ckb: "بە ڕوونی وتراوە کە متمانەپێکراو نییە.",
    },
  },
  abandoned: {
    key: "abandoned", rank: 10, band: "severe", term: "متروك",
    label: { en: "Abandoned", ar: "متروك", ckb: "وازلێهێنراو" },
    description: {
      en: "Scholars abandoned their narrations because of severe weakness.",
      ar: "تُرك حديثه لشدة ضعفه.",
      ckb: "زانایان گێڕانەوەکانیان وازلێهێنا بەهۆی لاوازیی توند.",
    },
  },
  "accused-liar": {
    key: "accused-liar", rank: 11, band: "severe", term: "متهم بالكذب",
    label: { en: "Accused of lying", ar: "متهم بالكذب", ckb: "تۆمەتباری درۆ" },
    description: {
      en: "Accused of fabricating. Their narrations are not used even as support.",
      ar: "اتُّهم بالكذب، فلا يُستشهد بحديثه.",
      ckb: "تۆمەتبارە بە درۆ؛ گێڕانەوەکانی تەنانەت وەک پشتگیریش بەکارنایەن.",
    },
  },
  liar: {
    key: "liar", rank: 12, band: "severe", term: "كذاب",
    label: { en: "Liar", ar: "كذاب", ckb: "درۆزن" },
    description: {
      en: "Known to have lied or fabricated hadith.",
      ar: "عُرف بالكذب أو الوضع.",
      ckb: "بە درۆ یان هەڵبەستنی فەرموودە ناسراوە.",
    },
  },
  none: {
    key: "none", rank: null, band: "none", term: "",
    label: { en: "No grade recorded", ar: "لا حكم مسجل", ckb: "هیچ پلەیەک تۆمار نەکراوە" },
    description: {
      en: "The dataset has no reliability grade for this person.",
      ar: "لا تتضمن البيانات حكمًا على هذا الراوي.",
      ckb: "داتاکە هیچ پلەیەکی متمانەی بۆ ئەم کەسە نییە.",
    },
  },
};

const RAW_TO_KEY: Record<string, GradeKey> = {
  "companion": "companion",
  "no doubt": "no-doubt",
  "thiqah thiqah": "thiqah-thiqah",
  "thiqah": "thiqah",
  "sadooq": "sadooq",
  "sadooq/delusion": "sadooq-errs",
  "maqbool": "maqbool",
  "unknown-majhool": "majhool",
  "weak": "weak",
  "not thiqah": "not-thiqah",
  "abandoned": "abandoned",
  "accused liar": "accused-liar",
  "liar": "liar",
};

export function gradeKeyFromRaw(raw: string | null | undefined): GradeKey {
  if (!raw) return "none";
  return RAW_TO_KEY[raw.trim().toLowerCase()] ?? "none";
}

/** Bands that a chain note should call out. */
export function isNoteworthyBand(band: GradeBand): boolean {
  return band === "fair" || band === "weak" || band === "severe" || band === "none";
}
