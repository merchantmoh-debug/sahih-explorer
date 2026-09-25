import { test } from "node:test";
import assert from "node:assert/strict";
import { parseName, sameNameKey, foldArticle } from "../../scripts/data/lib/names";
import { muslimRef, splitTitle, cleanEnglish } from "../../scripts/data/lib/helpers";
import { gradeKeyFromRaw, GRADES } from "../../lib/vocab/grades";
import { parseGeneration } from "../../lib/vocab/generations";
import { matchPlaces } from "../../lib/vocab/places";
import { normalizeArabic, normalizeLatin, arabicTokens } from "../../lib/text/normalize";

test("the Prophet ﷺ gets his own honorific, never a Companion's", () => {
  const p = parseName("Prophet Muhammad ( محمّد صلّی اللہ علیہ وآلہ وسلّم ( رضي الله عنه", "1");
  assert.equal(p.honorific, "saw");
  assert.ok(!p.ar.includes("رضي"));
});

test("names are split into English, Arabic and honorific", () => {
  const a = parseName("Abu Hurairah ( أبو هريرة - عبد الرحمن بن صخر الدوسي ( رضي الله عنه", "13");
  assert.deepEqual([a.en, a.ar, a.honorific], ["Abu Hurairah", "أبو هريرة", "ra"]);
  assert.equal(a.arFull, "أبو هريرة - عبد الرحمن بن صخر الدوسي");
  const b = parseName("'Aisha bint Abi Bakr ( أمّ المؤمنين عائشة بنت أبي بكر الصديق ( رضي الله عنها", "53");
  assert.equal(b.honorific, "raha");
  const c = parseName("al-Zuhri ابن شهاب الزهري‎, محمد بن مسلم", "11013");
  assert.deepEqual([c.en, c.ar], ["al-Zuhri", "ابن شهاب الزهري"]);
});

test("same-name keys group people cited alike", () => {
  assert.equal(sameNameKey("محمد بن عبد الله الأنصاري"), sameNameKey("محمد بن عبد الله بن نمير"));
  assert.notEqual(sameNameKey("محمد بن عبد الله"), sameNameKey("محمد بن بشار"));
  assert.equal(foldArticle("الليث"), "ليث");
  assert.equal(foldArticle("الله"), "الله");
});

test("grades and generations parse from the source strings", () => {
  assert.equal(gradeKeyFromRaw("Sadooq/Delusion"), "sadooq-errs");
  assert.equal(gradeKeyFromRaw("Unknown-Majhool"), "majhool");
  assert.equal(gradeKeyFromRaw(""), "none");
  assert.equal(GRADES.maqbool.rank, 6);
  const g = parseGeneration("3rd Century AH [11th generation] [Shafi'ee]");
  assert.deepEqual([g.cls, g.generation, g.century, g.madhhab], ["later", 11, 3, "shafii"]);
  assert.equal(parseGeneration("Comp.(RA) [3rd Generation]").generation, 1);
  assert.equal(parseGeneration("Succ. (Taba' Tabi') [7th generation]").cls, "successor2");
});

test("places are found inside free-text fields, specific before regional", () => {
  assert.deepEqual(matchPlaces("12th Rabi' awwal (Medina").map((p) => p.key), ["madinah"]);
  assert.deepEqual(matchPlaces("Hijaz, Uhud, Uhud").map((p) => p.key), ["uhud"]);
  assert.deepEqual(matchPlaces("al-Basra").map((p) => p.key), ["basra"]);
  assert.deepEqual(matchPlaces("NA"), []);
});

test("references, titles and English cleaning", () => {
  assert.equal(muslimRef(1907.01), "1907a");
  assert.equal(muslimRef("8.02"), "8b");
  assert.equal(muslimRef(12), "12");
  assert.equal(muslimRef(null), null);
  assert.deepEqual(splitTitle("Revelation - كتاب بدء الوحى"), { en: "Revelation", ar: "كتاب بدء الوحى" });
  assert.equal(cleanEnglish("وNarrated to us عبيد الله bin معاذ"), null);
  assert.equal(cleanEnglish("  Narrated   Abu Huraira:   The Prophet said  "), "Narrated Abu Huraira: The Prophet said");
});

test("text normalization folds spelling variants", () => {
  assert.equal(normalizeArabic("أَبِي هُرَيْرَةَ"), normalizeArabic("ابي هريره"));
  assert.deepEqual(arabicTokens("حَدَّثَنَا الْحُمَيْدِيُّ، قَالَ"), ["حدثنا", "الحميدي", "قال"]);
  assert.equal(normalizeLatin("ʿAbdullāh ibn ʿUmar"), "abdullah bin umar");
});
