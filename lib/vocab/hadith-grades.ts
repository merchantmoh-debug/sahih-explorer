// Terms used in the published gradings the site shows, as a short glossary.
import type { L10n } from "./grades";

export interface GradingTerm { key: string; term: string; label: L10n; description: L10n }

const G = (key: string, term: string, label: L10n, description: L10n): GradingTerm => ({ key, term, label, description });

export const GRADING_TERMS: GradingTerm[] = [
  G("sahih", "صحيح", { en: "Sahih (authentic)", ar: "صحيح", ckb: "سەحیح (ڕاست)" }, {
    en: "A connected chain of upright, precise narrators, free of hidden defects and of contradicting stronger reports.",
    ar: "ما اتصل سنده بنقل العدل الضابط عن مثله إلى منتهاه من غير شذوذ ولا علة.",
    ckb: "زنجیرەیەکی پەیوەست لە گێڕەرەوەی دادپەروەر و ورد، بێ کەموکوڕیی شاراوە و بێ دژایەتی لەگەڵ گێڕانەوەی بەهێزتر.",
  }),
  G("hasan", "حسن", { en: "Hasan (good)", ar: "حسن", ckb: "حەسەن (باش)" }, {
    en: "Like sahih, but a narrator's precision is somewhat lighter. Accepted as evidence.",
    ar: "كالصحيح إلا أن ضبط بعض رواته أخف، وهو مما يُحتج به.",
    ckb: "وەک سەحیح، بەڵام وردیی هەندێک لە گێڕەرەوەکان کەمترە. وەک بەڵگە وەردەگیرێت.",
  }),
  G("hasan-sahih", "حسن صحيح", { en: "Hasan sahih", ar: "حسن صحيح", ckb: "حەسەن سەحیح" }, {
    en: "A combined grade used especially by al-Tirmidhi; scholars explain it in more than one way (e.g. hasan by one chain and sahih by another).",
    ar: "حكم مركب يستعمله الترمذي خاصة، ولأهل العلم في تفسيره أقوال، منها أنه حسن بإسناد وصحيح بآخر.",
    ckb: "حوکمێکی تێکەڵ کە تیرمیزی بەتایبەتی بەکاری دەهێنێت؛ زانایان بە چەند شێوە ڕوونیان کردۆتەوە.",
  }),
  G("li-ghayrihi", "لغيره", { en: "… li-ghayrihi (by corroboration)", ar: "صحيح أو حسن لغيره", ckb: "بە پشتگیری (لغیرە)" }, {
    en: "Raised to sahih or hasan because other chains or supporting reports strengthen it, not by this chain alone.",
    ar: "ارتقى إلى الصحة أو الحسن بتعدد الطرق والشواهد لا بهذا الإسناد وحده.",
    ckb: "بەهۆی زنجیرە و گێڕانەوەی پشتگیریکەرەوە بەرز بۆتەوە بۆ سەحیح یان حەسەن، نەک تەنها بەم زنجیرەیە.",
  }),
  G("isnad", "إسناده صحيح/حسن/ضعيف", { en: "Isnad sahih / hasan / da'if", ar: "إسناده صحيح/حسن/ضعيف", ckb: "زنجیرەکەی سەحیح/حەسەن/لاواز" }, {
    en: "A verdict on the chain only. The hadith as a whole may be judged differently once all its chains and its text are considered.",
    ar: "حكم على الإسناد وحده، وقد يختلف الحكم على الحديث بعد جمع طرقه والنظر في متنه.",
    ckb: "حوکم تەنها لەسەر زنجیرەکەیە؛ لەوانەیە حوکمی فەرموودەکە دوای کۆکردنەوەی هەموو ڕێگاکانی جیاواز بێت.",
  }),
  G("daif", "ضعيف", { en: "Da'if (weak)", ar: "ضعيف", ckb: "لاواز (ضەعیف)" }, {
    en: "Lacks one or more conditions of acceptance: a break in the chain, a weak narrator, or a defect.",
    ar: "ما فقد شرطًا من شروط القبول، كانقطاع السند أو ضعف راوٍ أو علة.",
    ckb: "یەکێک یان زیاتر لە مەرجەکانی وەرگرتنی تێدا نییە: پچڕان لە زنجیرە، گێڕەرەوەی لاواز یان کەموکوڕی.",
  }),
  G("munkar", "منكر", { en: "Munkar (denounced)", ar: "منكر", ckb: "مونکەر" }, {
    en: "Narrated by a weak narrator contradicting reliable ones, or a text scholars rejected.",
    ar: "ما رواه الضعيف مخالفًا للثقات.",
    ckb: "گێڕەرەوەیەکی لاواز گێڕاویەتییەوە بە پێچەوانەی گێڕەرەوە متمانەپێکراوەکان.",
  }),
  G("mawdu", "موضوع", { en: "Mawdu' (fabricated)", ar: "موضوع", ckb: "هەڵبەستراو" }, {
    en: "A fabrication falsely attributed to the Prophet ﷺ.",
    ar: "المكذوب المختلق المنسوب إلى النبي ﷺ.",
    ckb: "درۆیەکی هەڵبەستراو کە بە هەڵە دراوەتە پاڵ پێغەمبەر ﷺ.",
  }),
];
