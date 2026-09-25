/**
 * One-time import of the legacy published data into compact source files.
 *
 * Before this change the site served ~430 MB of generated JSON from public/:
 *   public/data/scholars/{id}.json   one file per narrator, each embedding the
 *                                    full text of every hadith they appear in
 *   public/data/hadith-index.json    every hadith with its narrators
 *   public/data/search-index.json    narrator summaries (reliability grades)
 *
 * This script folds those into data/source/, the input of the data build:
 *   narrators.json         one raw narrator record per line, relations as IDs
 *   hadiths/{slug}.json    one raw hadith record per line, per collection
 *
 * English text comes from the per-narrator copies, which still hold the
 * dataset's original translations. The hadith-index copy had later been
 * "filled" by scripts that attached translations by hadith number (wrong
 * where numbering differs between editions) or by word-for-word replacement
 * (garbled), so its English is deliberately not imported.
 *
 * Usage (only meaningful against a checkout that still has the legacy files):
 *   npx tsx scripts/data/import-legacy.ts
 */
import fs from "node:fs";
import path from "node:path";
import { slugForLegacyName, COLLECTION_SLUGS, type CollectionSlug } from "../../lib/collections";
import { collapseWhitespace } from "../../lib/text/normalize";

const ROOT = process.cwd();
const LEGACY = path.join(ROOT, "public", "data");
const OUT = path.join(ROOT, "data", "source");

interface LegacyPerson { id: string; name: string; grade?: string }
interface LegacyHadithCopy {
  hadith_no: string; source: string; chapter: string; chapter_no: string;
  text_ar: string; text_en: string; usc_msa_ref?: string; chain: string[];
}
interface LegacyScholar {
  id: string; name: string; full_name: string; grade: string;
  biography: Record<string, unknown>;
  parents: LegacyPerson[]; spouses: LegacyPerson[]; siblings: LegacyPerson[];
  children: LegacyPerson[]; teachers: LegacyPerson[]; students: LegacyPerson[];
  hadiths: LegacyHadithCopy[];
}
interface LegacyIndexHadith {
  id: string; book: string; hadith_no: string; chapter_no: string; chapter: string;
  matn: string; matn_en: string; narrators: { id: string }[];
}
interface SearchEntry { id: string; reliability_grade?: string | null; score?: number; death_year?: string }

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/** JSON array with one record per line: valid JSON that still diffs well. */
function writeLines(file: string, header: Record<string, unknown>, key: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join(",\n");
  const head = JSON.stringify(header).slice(0, -1);
  fs.writeFileSync(file, `${head},"${key}":[\n${body}\n]}\n`);
}

const ids = (list: LegacyPerson[] | undefined) =>
  [...new Set((list ?? []).map((p) => String(p.id)).filter(Boolean))];

function main() {
  const scholarsDir = path.join(LEGACY, "scholars");
  if (!fs.existsSync(scholarsDir)) {
    console.error(`Legacy data not found at ${scholarsDir}; nothing to import.`);
    process.exit(1);
  }

  const search = new Map(
    readJson<SearchEntry[]>(path.join(LEGACY, "search-index.json")).map((s) => [String(s.id), s]),
  );

  const narrators: Record<string, unknown>[] = [];
  const copies = new Map<string, LegacyHadithCopy>();
  const files = fs.readdirSync(scholarsDir).filter((f) => f.endsWith(".json"));
  files.sort((a, b) => Number(a.slice(0, -5)) - Number(b.slice(0, -5)));

  for (const file of files) {
    const s = readJson<LegacyScholar>(path.join(scholarsDir, file));
    const extra = search.get(String(s.id));
    narrators.push({
      id: String(s.id),
      name: s.name,
      full_name: s.full_name,
      grade: s.grade,
      reliability_grade: extra?.reliability_grade ?? null,
      biography: s.biography,
      parents: ids(s.parents),
      spouses: ids(s.spouses),
      siblings: ids(s.siblings),
      children: ids(s.children),
      teachers: ids(s.teachers),
      students: ids(s.students),
    });
    for (const h of s.hadiths ?? []) {
      const key = copyKey(h.source, h.hadith_no, h.text_ar);
      if (!copies.has(key)) copies.set(key, h);
    }
  }

  const index = readJson<LegacyIndexHadith[]>(path.join(LEGACY, "hadith-index.json"));
  const byCollection = new Map<CollectionSlug, Record<string, unknown>[]>();
  let skippedEmpty = 0;
  let withoutCopy = 0;
  let chainMismatch = 0;

  for (const h of index) {
    const slug = slugForLegacyName(h.book);
    if (!slug) throw new Error(`Unknown collection ${h.book}`);
    const textAr = (h.matn ?? "").trim();
    if (!textAr) {
      skippedEmpty++;
      continue;
    }
    const copy = copies.get(copyKey(h.book, h.hadith_no, h.matn));
    if (!copy) withoutCopy++;
    const chain = h.narrators.map((n) => String(n.id));
    if (copy && copy.chain.join() !== chain.join()) chainMismatch++;
    const textEn = copy ? collapseWhitespace(copy.text_en ?? "") : "";
    const rows = byCollection.get(slug) ?? [];
    rows.push({
      legacy_id: h.id,
      hadith_no: h.hadith_no.trim(),
      chapter_no: String(h.chapter_no).trim(),
      chapter: collapseWhitespace(h.chapter),
      text_ar: textAr,
      text_en: textEn || null,
      usc_msa_ref: copy?.usc_msa_ref?.trim() || null,
      chain,
    });
    byCollection.set(slug, rows);
  }

  const header = {
    format: "sahih-explorer/source@1",
    note: "Imported once from the legacy public/data files by scripts/data/import-legacy.ts. This is the source of truth now: correct records here, one per line, then run npm run data:build. See DATA.md.",
  };
  writeLines(path.join(OUT, "narrators.json"), header, "narrators", narrators);
  for (const slug of COLLECTION_SLUGS) {
    writeLines(path.join(OUT, "hadiths", `${slug}.json`), { ...header, collection: slug }, "hadiths", byCollection.get(slug) ?? []);
  }

  console.log(`narrators: ${narrators.length}`);
  for (const slug of COLLECTION_SLUGS) console.log(`hadiths/${slug}: ${byCollection.get(slug)?.length ?? 0}`);
  console.log(`skipped (no Arabic text): ${skippedEmpty}`);
  console.log(`imported without a per-narrator copy (no original English): ${withoutCopy}`);
  console.log(`chains differing between the two legacy copies: ${chainMismatch}`);
}

function copyKey(source: string, no: string, textAr: string) {
  return `${source.trim()}|${no.trim()}|${collapseWhitespace(textAr ?? "")}`;
}

main();
