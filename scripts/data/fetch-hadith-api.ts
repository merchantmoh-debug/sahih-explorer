/**
 * Links every hadith in data/source to the matching entry of the
 * public-domain Hadith API (github.com/fawazahmed0/hadith-api, Unlicense) and
 * stores, per hadith:
 *   - the standard reference number used by most modern editions
 *     (for Muslim: the numbering of Muhammad Fuad Abd al-Baqi, e.g. 1907a),
 *   - the published gradings the API carries, with each grader's name,
 *   - an English translation, only where the dataset has none.
 *
 * Matching is by Arabic text, never by number: the dataset's own numbering
 * drifts from the standard one in several collections, and attaching data by
 * number is what produced mismatched translations before.
 *
 * Output: data/source/external/hadith-api/{slug}.json (committed).
 * Downloads are cached under .cache/hadith-api/.
 *
 * Usage: npx tsx scripts/data/fetch-hadith-api.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { COLLECTION_SLUGS, type CollectionSlug } from "../../lib/collections";
import { arabicTokens, collapseWhitespace, jaccard, wordBigrams } from "../../lib/text/normalize";

const BASE = "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1";
const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".cache", "hadith-api");
const SOURCE = path.join(ROOT, "data", "source");
const OUT = path.join(SOURCE, "external", "hadith-api");

/** Accept outright at or above this similarity. */
const STRONG = 0.8;
/** Accept between WEAK and STRONG only if the number fits between neighbours. */
const WEAK = 0.5;

interface ApiHadith { hadithnumber: number; arabicnumber?: number | string; text: string; grades?: { name: string; grade: string }[]; reference?: { book: number; hadith: number } }
interface ApiEdition { hadiths: ApiHadith[] }
interface ApiInfo { [slug: string]: { hadiths: { hadithnumber: number; grades: { name: string; grade: string }[]; reference: { book: number; hadith: number } }[] } }
interface SourceHadith { legacy_id: string; hadith_no: string; text_ar: string; text_en: string | null }

function download(name: string): string {
  const file = path.join(CACHE, name);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(CACHE, { recursive: true });
    console.log(`downloading ${name}`);
    execFileSync("curl", ["-sSfL", "--retry", "3", "-o", file, `${BASE}/${name}`], { stdio: "inherit" });
  }
  return file;
}

const readJson = <T,>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8")) as T;

function matchCollection(slug: CollectionSlug, info: ApiInfo) {
  const ours = readJson<{ hadiths: SourceHadith[] }>(path.join(SOURCE, "hadiths", `${slug}.json`)).hadiths;
  const ara = readJson<ApiEdition>(download(`editions/ara-${slug}.min.json`)).hadiths;
  const eng = new Map(readJson<ApiEdition>(download(`editions/eng-${slug}.min.json`)).hadiths.map((h) => [h.hadithnumber, h.text]));
  const meta = new Map(info[slug].hadiths.map((h) => [h.hadithnumber, h]));

  const grams = ara.map((a) => wordBigrams(arabicTokens(a.text)));
  const df = new Map<string, number>();
  for (const g of grams) for (const x of g) df.set(x, (df.get(x) ?? 0) + 1);
  const inverted = new Map<string, number[]>();
  grams.forEach((g, i) => {
    for (const x of g) if ((df.get(x) ?? 0) <= 40) {
      const list = inverted.get(x);
      if (list) list.push(i); else inverted.set(x, [i]);
    }
  });

  const best: { index: number; sim: number }[] = ours.map((h) => {
    const g = wordBigrams(arabicTokens(h.text_ar));
    const counts = new Map<number, number>();
    for (const x of g) for (const i of inverted.get(x) ?? []) counts.set(i, (counts.get(i) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    let res = { index: -1, sim: 0 };
    for (const [i] of top) {
      const sim = jaccard(g, grams[i]);
      if (sim > res.sim) res = { index: i, sim };
    }
    return res;
  });

  // Mid-similarity matches must fall between the numbers of the nearest
  // strong matches before and after them in the dataset's order.
  const strongNumber = best.map((b) => (b.index >= 0 && b.sim >= STRONG ? ara[b.index].hadithnumber : null));
  const prev: (number | null)[] = [];
  let last: number | null = null;
  for (const n of strongNumber) { prev.push(last); if (n !== null) last = n; }
  const next: (number | null)[] = new Array(strongNumber.length);
  last = null;
  for (let i = strongNumber.length - 1; i >= 0; i--) { next[i] = last; if (strongNumber[i] !== null) last = strongNumber[i]; }

  const matches: Record<string, unknown> = {};
  const stats = { strong: 0, bounded: 0, rejected: 0, englishFilled: 0, graded: 0 };
  ours.forEach((h, i) => {
    const b = best[i];
    if (b.index < 0 || b.sim < WEAK) { stats.rejected++; return; }
    const a = ara[b.index];
    if (b.sim < STRONG) {
      const lo = prev[i] ?? -Infinity;
      const hi = next[i] ?? Infinity;
      if (a.hadithnumber < lo - 2 || a.hadithnumber > hi + 2) { stats.rejected++; return; }
      stats.bounded++;
    } else stats.strong++;
    const m = meta.get(a.hadithnumber);
    const grades = (m?.grades ?? []).filter((g) => g.name && g.grade).map((g) => [g.name.trim(), g.grade.trim()]);
    if (grades.length) stats.graded++;
    const entry: Record<string, unknown> = {
      n: a.hadithnumber,
      an: a.arabicnumber ?? null,
      ref: m?.reference ? [m.reference.book, m.reference.hadith] : null,
      sim: Math.round(b.sim * 1000) / 1000,
    };
    if (grades.length) entry.grades = grades;
    const english = collapseWhitespace(eng.get(a.hadithnumber) ?? "");
    if (!h.text_en && english && b.sim >= STRONG) {
      entry.en = english;
      stats.englishFilled++;
    }
    matches[h.legacy_id] = entry;
  });

  fs.mkdirSync(OUT, { recursive: true });
  const body = Object.entries(matches).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(",\n");
  const header = {
    format: "sahih-explorer/hadith-api-links@1",
    source: `${BASE}/editions/ara-${slug}.min.json, eng-${slug}.min.json, info.json`,
    license: "The Unlicense (public domain), https://github.com/fawazahmed0/hadith-api",
    retrieved: new Date().toISOString().slice(0, 10),
    method: `Arabic word-bigram Jaccard similarity; accepted at >= ${STRONG}, or >= ${WEAK} when the number falls between neighbouring strong matches.`,
  };
  fs.writeFileSync(path.join(OUT, `${slug}.json`), `${JSON.stringify(header).slice(0, -1)},"matches":{\n${body}\n}}\n`);
  console.log(`${slug.padEnd(9)} ours=${ours.length} strong=${stats.strong} bounded=${stats.bounded} rejected=${stats.rejected} graded=${stats.graded} english-filled=${stats.englishFilled}`);
}

function main() {
  const info = readJson<ApiInfo>(download("info.json"));
  for (const slug of COLLECTION_SLUGS) matchCollection(slug, info);
}

main();
