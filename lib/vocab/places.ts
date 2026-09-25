// Gazetteer for the place names in the source data: canonical names in each
// language plus approximate coordinates for the places map. Regions are
// plotted at a representative point.
import type { L10n } from "./grades";

export interface Place {
  key: string;
  name: L10n;
  lat: number;
  lon: number;
  region?: boolean;
  aliases: string[];
}

const P = (key: string, en: string, ar: string, ckb: string, lat: number, lon: number, aliases: string[] = [], region = false): Place =>
  ({ key, name: { en, ar, ckb }, lat, lon, region, aliases: [en, ...aliases] });

export const PLACES: Place[] = [
  P("makkah", "Makkah", "مكة", "مەککە", 21.4225, 39.8262, ["Mecca", "Makkak", "est., Makkah"]),
  P("madinah", "Madinah", "المدينة", "مەدینە", 24.4672, 39.6111, ["Medina", "Medinah", "Madina", "Madni", "Medianh", "Harrah", "al-Harra", "l-Harra"]),
  P("hijaz", "Hijaz", "الحجاز", "حیجاز", 23.4, 39.9, ["HIjaz"], true),
  P("taif", "Ta'if", "الطائف", "تائیف", 21.2703, 40.4158, ["Taif", "Tai'f", "Ta"]),
  P("uhud", "Uhud", "أحد", "ئوحود", 24.5, 39.61),
  P("badr", "Badr", "بدر", "بەدر", 23.78, 38.79),
  P("khaybar", "Khaybar", "خيبر", "خەیبەر", 25.7, 39.29, ["Khybar"]),
  P("rabadha", "al-Rabadha", "الربذة", "ڕەبەزە", 24.64, 41.3, ["Rabathah", "Al-Rabathah"]),
  P("yamama", "al-Yamama", "اليمامة", "یەمامە", 24.1, 47.3, ["Yamamah"]),
  P("najd", "Najd", "نجد", "نەجد", 25.0, 45.0, ["Nejd"], true),
  P("bahrain", "Bahrain", "البحرين", "بەحرەین", 26.0, 50.2, ["Bahrian"], true),
  P("oman", "Oman", "عمان", "عومان", 23.6, 58.4, [], true),
  P("yemen", "Yemen", "اليمن", "یەمەن", 15.9, 44.5, ["Yeman"], true),
  P("sanaa", "Sana'a", "صنعاء", "سەنعا", 15.3694, 44.191, ["Sana'", "Sana"]),
  P("aden", "Aden", "عدن", "عەدەن", 12.7855, 45.0187, ["'Aden"]),
  P("dhamar", "Dhamar", "ذمار", "زەمار", 14.54, 44.4),
  P("najran", "Najran", "نجران", "نەجران", 17.49, 44.13, ["Najaran"]),
  P("hadramawt", "Hadramawt", "حضرموت", "حەزرەمەوت", 15.9, 48.8, [], true),
  P("abyssinia", "Abyssinia", "الحبشة", "حەبەشە", 14.13, 38.72, ["Abyssina"], true),
  P("iraq", "Iraq", "العراق", "عێراق", 32.8, 44.2, ["'Iraq"], true),
  P("kufa", "Kufa", "الكوفة", "کوفە", 32.0346, 44.4021, ["Kufah", "Kufi"]),
  P("basra", "Basra", "البصرة", "بەسرە", 30.5085, 47.7804, ["Basrah", "Basri"]),
  P("baghdad", "Baghdad", "بغداد", "بەغدا", 33.3152, 44.3661, ["Bagghdad", "Bagh"]),
  P("wasit", "Wasit", "واسط", "واسیت", 32.18, 46.3, ["Wast"]),
  P("madain", "al-Mada'in", "المدائن", "مەدائین", 33.0936, 44.5808, ["Mada'in"]),
  P("anbar", "al-Anbar", "الأنبار", "ئەنبار", 33.37, 43.72, ["Anbar"]),
  P("qadisiyya", "al-Qadisiyya", "القادسية", "قادسییە", 31.7, 44.5, ["Qadisiya", "Qadsia", "Qadsiya"]),
  P("mosul", "Mosul", "الموصل", "مووسڵ", 36.34, 43.13, ["Musal"]),
  P("jazira", "al-Jazira", "الجزيرة", "جەزیرە", 36.5, 40.5, ["Jaziara", "Jazirah"], true),
  P("raqqa", "al-Raqqa", "الرقة", "ڕەققە", 35.95, 39.01),
  P("harran", "Harran", "حران", "حەڕان", 36.86, 39.03, ["Hiran"]),
  P("ruha", "al-Ruha (Edessa)", "الرها", "ڕوها", 37.16, 38.79, ["Raha", "Rahawa"]),
  P("siffin", "Siffin", "صفين", "سیففین", 35.95, 39.05),
  P("sham", "al-Sham", "الشام", "شام", 34.2, 37.2, ["Syria"], true),
  P("damascus", "Damascus", "دمشق", "دیمەشق", 33.5138, 36.2765, ["Damasus"]),
  P("hims", "Hims", "حمص", "حومس", 34.7324, 36.7137, ["HIms"]),
  P("aleppo", "Aleppo", "حلب", "حەلەب", 36.2021, 37.1343, ["Halb"]),
  P("antioch", "Antioch", "أنطاكية", "ئەنتاکیا", 36.2025, 36.1605),
  P("massisa", "al-Massisa", "المصيصة", "مەسیسە", 36.957, 35.63, ["Musaysa"]),
  P("tarsus", "Tarsus", "طرسوس", "تەرسووس", 36.9177, 34.8928, ["Tursus", "Tartaus"]),
  P("thughur", "the frontier (al-Thughur)", "الثغور", "سنوورەکان", 36.9, 35.9, ["Thaghar"], true),
  P("palestine", "Palestine", "فلسطين", "فەلەستین", 31.9, 35.1, [], true),
  P("jerusalem", "Jerusalem", "بيت المقدس", "قودس", 31.7767, 35.2345, ["Jureslum"]),
  P("ramla", "al-Ramla", "الرملة", "ڕەملە", 31.9279, 34.8625),
  P("asqalan", "Ascalon", "عسقلان", "عەسقەلان", 31.6688, 34.5743, ["'Asqalan", "Asqalan"]),
  P("amwas", "'Amwas", "عمواس", "عەمواس", 31.84, 34.99, ["Amawas"]),
  P("ajnadayn", "Ajnadayn", "أجنادين", "ئەجنادەین", 31.6, 34.95, ["Ajanadin", "Ajnadin"]),
  P("yarmuk", "Yarmuk", "اليرموك", "یەرمووک", 32.8, 35.95, ["Yarmouk"]),
  P("muta", "Mu'ta", "مؤتة", "موئتە", 31.08, 35.7, ["Mau'ta", "Mu'tah"]),
  P("beirut", "Beirut", "بيروت", "بەیروت", 33.8938, 35.5018, ["Beruit"]),
  P("caesarea", "Caesarea", "قيسارية", "قەیسەرییە", 32.5, 34.89, ["Qaysariyya"]),
  P("jordan", "Jordan valley", "الأردن", "ئوردن", 32.0, 35.6, ["Jordon"], true),
  P("egypt", "Egypt", "مصر", "میسر", 30.0, 31.23, ["Masri"], true),
  P("alexandria", "Alexandria", "الإسكندرية", "ئەسکەندەرییە", 31.2001, 29.9187),
  P("ifriqiya", "Ifriqiya", "إفريقية", "ئەفریقیا", 35.68, 10.1, ["Africa"], true),
  P("tunis", "Tunis", "تونس", "تونس", 36.8065, 10.1815),
  P("andalus", "al-Andalus", "الأندلس", "ئەندەلوس", 37.88, -4.78, ["Andulus"], true),
  P("cordoba", "Cordoba", "قرطبة", "قورتوبە", 37.8882, -4.7794, ["Qurtaba"]),
  P("rum", "Byzantium (al-Rum)", "الروم", "ڕۆم", 41.0, 28.98, ["Rome"], true),
  P("armenia", "Armenia", "أرمينية", "ئەرمەنیا", 40.2, 44.5, ["Arminia"], true),
  P("persia", "Persia", "فارس", "فارس", 29.6, 52.5, ["Fars", "Iran"], true),
  P("rayy", "al-Rayy", "الري", "ڕەی", 35.59, 51.44, ["Ray", "Ray'", "Raiy"]),
  P("hamadan", "Hamadan", "همذان", "هەمەدان", 34.7983, 48.5148),
  P("isfahan", "Isfahan", "أصبهان", "ئەسفەهان", 32.6546, 51.668, ["Asbahan"]),
  P("qazwin", "Qazvin", "قزوين", "قەزوین", 36.2688, 50.0041, ["Qazwayn", "Qazwan"]),
  P("nahawand", "Nahavand", "نهاوند", "نەهاوەند", 34.19, 48.37, ["Nahawand"]),
  P("hulwan", "Hulwan", "حلوان", "حوڵوان", 34.5, 45.87, ["Halwan"]),
  P("dinawar", "Dinawar", "الدينور", "دینەوەر", 34.58, 47.43, ["Daynur"]),
  P("tabriz", "Tabriz", "تبريز", "تەورێز", 38.08, 46.29, ["Tabrez"]),
  P("jurjan", "Jurjan", "جرجان", "جورجان", 36.84, 54.43, ["Jarjan"]),
  P("tabaristan", "Tabaristan", "طبرستان", "تەبەرستان", 36.5, 52.5, [], true),
  P("kirman", "Kirman", "كرمان", "کرمان", 30.28, 57.08, ["Kirmani"]),
  P("khurasan", "Khurasan", "خراسان", "خوراسان", 36.3, 59.6, ["Khurasaan"], true),
  P("nishapur", "Nishapur", "نيسابور", "نیشاپوور", 36.2133, 58.7958, ["Nisapur"]),
  P("tus", "Tus", "طوس", "تووس", 36.48, 59.5, ["Tusi"]),
  P("nasa", "Nasa", "نسا", "نەسا", 38.0, 58.2, ["Nisa'", "Nisa"]),
  P("merv", "Merv", "مرو", "مەرو", 37.66, 62.19, ["Marv"]),
  P("herat", "Herat", "هراة", "هەرات", 34.3529, 62.204, ["Hirat", "Harat"]),
  P("sijistan", "Sijistan", "سجستان", "سیستان", 31.0, 61.5, ["Sajistan"], true),
  P("balkh", "Balkh", "بلخ", "بەلخ", 36.7581, 66.8977, ["Bulkh"]),
  P("talaqan", "Taloqan", "الطالقان", "تالەقان", 36.73, 69.53, ["Talaqan"]),
  P("kabul", "Kabul", "كابل", "کابول", 34.5553, 69.2075),
  P("tirmidh", "Tirmidh", "ترمذ", "تیرمیز", 37.2242, 67.2783),
  P("saghaniyan", "Saghaniyan", "الصغانيان", "سەغانیان", 38.2, 67.9, ["Saghan"]),
  P("bukhara", "Bukhara", "بخارى", "بوخارا", 39.7747, 64.4286),
  P("samarqand", "Samarqand", "سمرقند", "سەمەرقەند", 39.6542, 66.9597),
  P("khwarazm", "Khwarazm", "خوارزم", "خوارەزم", 41.55, 60.63, ["Khuwarzam", "Khwarzam"], true),
];

function aliasKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/^al-|^as-|^ar-|^l-/, "")
    .replace(/['’`ʿʾ.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const BY_ALIAS = new Map<string, Place>();
for (const p of PLACES) for (const a of p.aliases) BY_ALIAS.set(aliasKey(a), p);

export const PLACE_BY_KEY = new Map(PLACES.map((p) => [p.key, p]));

/** Finds known places in a free-text place field such as
 *  "12th Rabi' awwal (Medina" or "Hijaz, Uhud, Uhud". */
export function matchPlaces(raw: string | null | undefined): Place[] {
  if (!raw) return [];
  const found: Place[] = [];
  for (const part of raw.split(/[,/()]|\.\s|\s-\s/)) {
    const p = BY_ALIAS.get(aliasKey(part));
    if (p && !found.includes(p)) found.push(p);
  }
  // Prefer specific places over the regions that contain them.
  const specific = found.filter((p) => !p.region);
  return specific.length ? specific : found;
}
