// Words of transmission (sigh al-ada') that link one narrator to the next.
import type { L10n } from "./grades";

export const TERM_KEYS = ["haddathana", "haddathani", "akhbarana", "akhbarani", "anbaana", "samitu", "an", "anna", "qala"] as const;
export type TermKey = (typeof TERM_KEYS)[number];

export interface TermInfo {
  key: TermKey;
  ar: string;
  translit: string;
  /** Whether the wording itself states that the narrator heard directly. */
  explicit: boolean;
  label: L10n;
  description: L10n;
}

export const TERMS: Record<TermKey, TermInfo> = {
  haddathana: {
    key: "haddathana", ar: "حدثنا", translit: "haddathana", explicit: true,
    label: { en: "narrated to us", ar: "حدثنا", ckb: "بۆی گێڕاینەوە" },
    description: {
      en: "“He narrated to us”: the narrator heard the teacher directly, usually in a group.",
      ar: "صيغة سماع صريحة، وتُستعمل غالبًا لما سُمع من لفظ الشيخ مع غيره.",
      ckb: "«بۆی گێڕاینەوە»: گێڕەرەوە ڕاستەوخۆ لە مامۆستاکەی بیستووە، زۆرجار لەگەڵ کۆمەڵێک.",
    },
  },
  haddathani: {
    key: "haddathani", ar: "حدثني", translit: "haddathani", explicit: true,
    label: { en: "narrated to me", ar: "حدثني", ckb: "بۆی گێڕامەوە" },
    description: {
      en: "“He narrated to me”: heard directly and alone from the teacher.",
      ar: "صيغة سماع صريحة لما سمعه الراوي من شيخه وحده.",
      ckb: "«بۆی گێڕامەوە»: بەتەنها و ڕاستەوخۆ لە مامۆستاکەی بیستووە.",
    },
  },
  akhbarana: {
    key: "akhbarana", ar: "أخبرنا", translit: "akhbarana", explicit: true,
    label: { en: "informed us", ar: "أخبرنا", ckb: "هەواڵی پێداین" },
    description: {
      en: "“He informed us”: direct transmission; many scholars (including Muslim and al-Nasa'i) reserve it for texts read aloud to the teacher.",
      ar: "صيغة اتصال، وخصها كثير من المحدثين كمسلم والنسائي بما قُرئ على الشيخ.",
      ckb: "«هەواڵی پێداین»: گواستنەوەی ڕاستەوخۆ؛ زۆرێک لە زانایان بۆ ئەو دەقانە بەکاری دەهێنن کە بۆ مامۆستا خوێندراونەتەوە.",
    },
  },
  akhbarani: {
    key: "akhbarani", ar: "أخبرني", translit: "akhbarani", explicit: true,
    label: { en: "informed me", ar: "أخبرني", ckb: "هەواڵی پێدام" },
    description: {
      en: "“He informed me”: as above, received alone.",
      ar: "كأخبرنا، لما تلقاه الراوي وحده.",
      ckb: "وەک سەرەوە، بەڵام بەتەنها وەرگیراوە.",
    },
  },
  anbaana: {
    key: "anbaana", ar: "أنبأنا", translit: "anba'ana", explicit: true,
    label: { en: "reported to us", ar: "أنبأنا", ckb: "ڕایگەیاندین" },
    description: {
      en: "“He reported to us”: early scholars used it like akhbarana; later ones often meant a teacher's permission (ijaza).",
      ar: "كانت عند المتقدمين كأخبرنا، واستعملها المتأخرون كثيرًا في الإجازة.",
      ckb: "زانایانی پێشوو وەک «أخبرنا» بەکاریان هێناوە؛ دواتر زۆرجار بۆ ئیجازە.",
    },
  },
  samitu: {
    key: "samitu", ar: "سمعت", translit: "sami'tu", explicit: true,
    label: { en: "I heard", ar: "سمعت", ckb: "بیستم" },
    description: {
      en: "“I heard”: the most explicit statement of hearing directly.",
      ar: "أصرح صيغ السماع.",
      ckb: "«بیستم»: ڕوونترین دەربڕینی بیستنی ڕاستەوخۆ.",
    },
  },
  an: {
    key: "an", ar: "عن", translit: "'an", explicit: false,
    label: { en: "from", ar: "عن", ckb: "لە" },
    description: {
      en: "“From” ('an'ana): does not say how the report was received. It counts as connected when the narrator is not known for concealing gaps (tadlis) and could have met the teacher; al-Bukhari and Muslim set different conditions for that.",
      ar: "العنعنة لا تصرح بالسماع، وتُحمل على الاتصال إذا سلم الراوي من التدليس وأمكن لقاؤه بشيخه، على خلاف بين البخاري ومسلم في شرط ذلك.",
      ckb: "«لە» (عەنعەنە): ناڵێت چۆن وەرگیراوە. بە پەیوەست دادەنرێت ئەگەر گێڕەرەوە بە شاردنەوەی کەلێن (تەدلیس) نەناسرابێت و توانیبێتی مامۆستاکەی ببینێت.",
    },
  },
  anna: {
    key: "anna", ar: "أن", translit: "anna", explicit: false,
    label: { en: "that", ar: "أن", ckb: "کە" },
    description: {
      en: "“That” (anna): like 'an, it does not state direct hearing.",
      ar: "الأنأنة كالعنعنة لا تصرح بالسماع.",
      ckb: "«کە»: وەک «لە»، بیستنی ڕاستەوخۆ ڕاناگەیەنێت.",
    },
  },
  qala: {
    key: "qala", ar: "قال", translit: "qala", explicit: false,
    label: { en: "said", ar: "قال", ckb: "وتی" },
    description: {
      en: "“He said”: on its own it does not state how the report was received.",
      ar: "لا تصرح بكيفية التلقي إذا جاءت وحدها.",
      ckb: "«وتی»: بەتەنها ڕوون ناکاتەوە چۆن وەرگیراوە.",
    },
  },
};

/** Maps a normalized (diacritic-free, alef-folded) Arabic token to a term. */
export const TERM_BY_TOKEN: Record<string, TermKey> = {
  "حدثنا": "haddathana", "وحدثنا": "haddathana", "فحدثنا": "haddathana", "حدثناه": "haddathana", "ثنا": "haddathana",
  "حدثني": "haddathani", "وحدثني": "haddathani", "فحدثني": "haddathani", "حدثنيه": "haddathani",
  "اخبرنا": "akhbarana", "واخبرنا": "akhbarana", "اخبرناه": "akhbarana",
  "اخبرني": "akhbarani", "واخبرني": "akhbarani", "اخبرنيه": "akhbarani",
  "انبانا": "anbaana", "وانبانا": "anbaana", "نبانا": "anbaana", "انباني": "anbaana",
  "سمعت": "samitu", "سمعنا": "samitu", "سمع": "samitu", "يسمع": "samitu", "سمعته": "samitu",
  "عن": "an", "وعن": "an",
  "ان": "anna", "انه": "anna", "انها": "anna",
  "قال": "qala", "قالا": "qala", "قالوا": "qala", "قالت": "qala", "يقول": "qala", "وقال": "qala", "فقال": "qala",
};

/** Words that say several narrators before this point share the next one. */
export const PLURAL_MARKERS = new Set(["قالا", "قالوا", "كلاهما", "جميعا", "كلهم", "قالوا", "حدثانا", "اخبرانا"]);
