/**
 * Data build: data/source → data/build.
 *
 * Normalizes narrators, links every hadith's chain to its Arabic text,
 * builds transmission graphs, attaches standard references and published
 * gradings, derives teacher/student relations from both the source lists and
 * the chains themselves, groups the same report across collections, and
 * writes the sharded files the site and API read. Integrity checks run last
 * and fail the build when a limit is exceeded.
 *
 * Usage: npx tsx scripts/data/build.ts [--force]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { COLLECTIONS, COLLECTION_SLUGS, type CollectionSlug } from "../../lib/collections";
import { arabicTokens, hasArabic, normalizeForSearch } from "../../lib/text/normalize";
import { gradeKeyFromRaw, type GradeKey } from "../../lib/vocab/grades";
import { parseGeneration, type ParsedGeneration } from "../../lib/vocab/generations";
import { matchPlaces } from "../../lib/vocab/places";
import type { TermKey } from "../../lib/vocab/terms";
import type {
  BookSummary, BuildMeta, CollectionSummary, EdgeRow, HadithRecord, HadithSearchRow,
  LifeEvent, NarratorIndexRow, NarratorLink, NarratorRecord, NarratorSummary,
} from "../../lib/data/types";
import { parseName, nameTokenSet, nameUnits, sameNameKey, foldArticle, type ParsedName } from "./lib/names";
import { alignChain, isFollowUpText, type Alignment, type NameIndex } from "./lib/align";
import { buildGraph, PROPHET_ID } from "./lib/graph";
import { chainNotes } from "./lib/notes";
import { cleanEnglish, GARBLED, muslimRef, snippet, splitTitle } from "./lib/helpers";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "data", "source");
const OUT = path.join(ROOT, "data", "build");
export const NARRATOR_SHARDS = 64;

// ---------------------------------------------------------------- sources

interface RawLife { date_hijri?: string; date_gregorian?: string; date_display?: string[] | null; place?: string; reason?: string }
interface RawNarrator {
  id: string; name: string; full_name: string; grade: string; reliability_grade: string | null;
  biography: { birth?: RawLife; death?: RawLife; places_of_stay?: string[]; area_of_interest?: string[]; tags?: string[] };
  parents: string[]; spouses: string[]; siblings: string[]; children: string[]; teachers: string[]; students: string[];
}
interface RawHadith {
  legacy_id: string; hadith_no: string; chapter_no: string; chapter: string;
  text_ar: string; text_en: string | null; usc_msa_ref: string | null; chain: string[];
}
interface ApiLink { n: number; an: number | string | null; ref: [number, number] | null; sim: number; grades?: [string, string][]; en?: string }

const readJson = <T,>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8")) as T;

function sourceFiles(): string[] {
  const files = [path.join(SRC, "narrators.json")];
  for (const c of COLLECTION_SLUGS) {
    files.push(path.join(SRC, "hadiths", `${c}.json`));
    const ext = path.join(SRC, "external", "hadith-api", `${c}.json`);
    if (fs.existsSync(ext)) files.push(ext);
  }
  return files;
}

function hashSources(): string {
  const h = crypto.createHash("sha256");
  for (const f of sourceFiles()) h.update(fs.readFileSync(f));
  // Code that shapes the output is part of the input.
  for (const dir of [path.join(ROOT, "scripts", "data"), path.join(ROOT, "lib", "vocab"), path.join(ROOT, "lib", "text")]) {
    for (const f of walk(dir)) h.update(fs.readFileSync(f));
  }
  return h.digest("hex").slice(0, 16);
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  }).sort();
}

// ---------------------------------------------------------------- narrators

interface NarratorWork {
  id: string;
  name: ParsedName;
  legacyName: string;
  gen: ParsedGeneration;
  grade: GradeKey;
  verdictAr: string | null;
  books: string | null;
  birth: LifeEvent | null;
  death: (LifeEvent & { martyred: boolean }) | null;
  places: { key: string | null; raw: string }[];
  tags: string[];
  interests: string[];
  family: NarratorRecord["family"];
  listedTeachers: string[];
  listedStudents: string[];
}

const num = (s: string | undefined | null): number | null => {
  const t = (s ?? "").trim();
  return /^\d{1,4}$/.test(t) ? Number(t) : null;
};

function cleanPlace(raw: string | undefined | null): string | null {
  const t = (raw ?? "").trim();
  if (!t || t === "NA") return null;
  return t.replace(/\s+/g, " ").replace(/^\(|\($/g, "").trim();
}

function parseBirth(b: RawLife | undefined): LifeEvent | null {
  if (!b) return null;
  let ah: number | null = null;
  let ce: number | null = null;
  for (const item of b.date_display ?? []) {
    const m = String(item).match(/(\d{1,4})\s*(BH|AH|CE)/i);
    if (!m) continue;
    const v = Number(m[1]);
    const era = m[2].toUpperCase();
    if (era === "BH") ah = -v;
    else if (era === "AH") ah = v;
    else ce = v;
  }
  if (ah === null && !(b.date_display ?? []).length) {
    const h = num(b.date_hijri);
    const g = num(b.date_gregorian);
    if (h !== null && g !== null) {
      if (Math.abs(g - (622 + h * 0.97)) < 6) ah = h;
      else if (Math.abs(g - (622 - h * 1.03)) < 6) ah = -h;
      ce = g;
    }
  }
  const place = cleanPlace(b.place);
  if (ah === null && ce === null && !place) return null;
  return { ah, ce, place, placeKeys: matchPlaces(place).map((p) => p.key) };
}

function parseDeath(d: RawLife | undefined): (LifeEvent & { martyred: boolean }) | null {
  if (!d) return null;
  const ah = num(d.date_hijri);
  const ce = num(d.date_gregorian);
  const place = cleanPlace(d.place);
  const martyred = (d.reason ?? "").trim() === "Martyred";
  if (ah === null && ce === null && !place && !martyred) return null;
  return { ah, ce, place, placeKeys: matchPlaces(place).map((p) => p.key), martyred };
}

const TAQRIB = /\[\s*([^\]\-]+?)\s*-\s*([^\]]+?)\s*\]/;

function parseNarrator(r: RawNarrator): NarratorWork {
  const id = String(r.id);
  const gen = parseGeneration(r.grade);
  let grade = gradeKeyFromRaw(r.reliability_grade);
  if (id === PROPHET_ID) { grade = "prophet"; gen.cls = "prophet"; gen.generation = null; }
  if (grade === "none" && gen.cls === "companion") grade = "companion";

  let verdictAr: string | null = null;
  let books: string | null = null;
  const interests: string[] = [];
  for (const item of r.biography.area_of_interest ?? []) {
    const t = item.trim();
    if (t.startsWith("Narrator")) {
      const m = t.match(TAQRIB);
      if (m && hasArabic(m[2]) && !verdictAr) {
        verdictAr = m[2].trim();
        books = /Grade/.test(m[1]) ? null : m[1].replace(/\s+/g, " ").trim();
      }
      continue;
    }
    if (t && t !== "NA" && !/[\[\]:]/.test(t)) interests.push(t);
  }

  const places = (r.biography.places_of_stay ?? [])
    .map((p) => p.trim())
    .filter((p) => p && p !== "NA")
    .map((raw) => ({ key: matchPlaces(raw)[0]?.key ?? null, raw }));
  const uniquePlaces = places.filter((p, i) => places.findIndex((q) => (q.key ?? q.raw) === (p.key ?? p.raw)) === i);

  return {
    id,
    name: parseName(r.name || r.full_name, id),
    legacyName: r.name,
    gen,
    grade,
    verdictAr,
    books,
    birth: id === PROPHET_ID ? { ah: -53, ce: 570, place: "Makkah", placeKeys: ["makkah"] } : parseBirth(r.biography.birth),
    death: id === PROPHET_ID ? { ah: 11, ce: 632, place: "Madinah", placeKeys: ["madinah"], martyred: false } : parseDeath(r.biography.death),
    places: uniquePlaces,
    tags: [...new Set((r.biography.tags ?? []).map((t) => t.trim()).filter((t) => t && t !== "NA"))],
    interests: [...new Set(interests)],
    family: { parents: r.parents, spouses: r.spouses, siblings: r.siblings, children: r.children },
    listedTeachers: r.teachers,
    listedStudents: r.students,
  };
}

// ---------------------------------------------------------------- helpers

/** Build files are gzipped JSON: about a fifth of the size, which keeps
 *  serverless bundles small, and cheap to inflate per request. */
function writeJson(rel: string, value: unknown) {
  const file = path.join(OUT, `${rel}.gz`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(value), { level: 9 }));
}

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    let p = this.parent.get(x) ?? x;
    if (p !== x) { p = this.find(p); this.parent.set(x, p); }
    return p;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

// ---------------------------------------------------------------- main

function main() {
  const started = Date.now();
  const force = process.argv.includes("--force");
  const sourceHash = hashSources();
  const metaFile = path.join(OUT, "meta.json.gz");
  if (!force && fs.existsSync(metaFile) && (JSON.parse(zlib.gunzipSync(fs.readFileSync(metaFile)).toString("utf8")) as BuildMeta).sourceHash === sourceHash) {
    console.log(`data/build is up to date (${sourceHash}); use --force to rebuild.`);
    return;
  }
  fs.rmSync(OUT, { recursive: true, force: true });

  // Narrators
  const rawNarrators = readJson<{ narrators: RawNarrator[] }>(path.join(SRC, "narrators.json")).narrators;
  const work = new Map(rawNarrators.map((r) => [String(r.id), parseNarrator(r)]));
  console.log(`narrators: ${work.size}`);

  // Name index for alignment.
  const units = new Map<string, Set<string>>();
  const df = new Map<string, number>();
  const firstUnits = new Set<string>();
  for (const w of work.values()) {
    const set = nameTokenSet(`${w.name.ar} ${w.name.arFull}`);
    units.set(w.id, set);
    for (const u of set) df.set(u, (df.get(u) ?? 0) + 1);
    const first = nameUnits(w.name.ar)[0];
    if (first && first.length > 2) firstUnits.add(first);
  }
  const total = work.size;
  const teacherCandidates = new Map<string, Set<string>>();
  const isCompanion = (id: string) => {
    const w = work.get(id);
    return Boolean(w && (w.gen.cls === "companion" || w.grade === "companion"));
  };
  const parentsOf = new Map<string, Set<string>>();
  for (const w of work.values()) parentsOf.set(w.id, new Set(w.family.parents));
  const nameIndex: NameIndex = {
    units: (id) => units.get(id),
    idf: (u) => Math.log(total / (1 + (df.get(u) ?? 0))),
    known: (u) => df.has(u),
    teachers: (id) => [...(teacherCandidates.get(id) ?? [])],
    isCompanion: (id) => isCompanion(id),
    parents: (id) => parentsOf.get(id) ?? new Set(),
    firstUnits,
  };

  // Listed relations, both directions.
  const listed = new Set<string>();
  for (const w of work.values()) {
    for (const t of w.listedTeachers) if (work.has(t)) listed.add(`${t}>${w.id}`);
    for (const s of w.listedStudents) if (work.has(s)) listed.add(`${w.id}>${s}`);
  }

  // Same-name groups (membership now, ordering once counts are known).
  const groups = new Map<string, string[]>();
  const groupOf = new Map<string, string>();
  for (const w of work.values()) {
    if (w.id === PROPHET_ID) continue;
    const key = sameNameKey(w.name.ar);
    if (!key) continue;
    const g = groups.get(key) ?? [];
    g.push(w.id);
    groups.set(key, g);
    groupOf.set(w.id, key);
  }

  // A distinctive nisba in the text that belongs to a same-name narrator
  // other than the one the source linked.
  const nameDiffersFor = (text: string, segs: { s: number; e: number; id: string }[]) => {
    const out: { id: string; alt: string; text: string }[] = [];
    for (const seg of segs) {
      const own = units.get(seg.id);
      const group = groups.get(groupOf.get(seg.id) ?? "");
      if (!own || !group || group.length < 2) continue;
      const words = arabicTokens(text.slice(seg.s, seg.e));
      for (const raw of words) {
        if (!raw.startsWith("ال") || !raw.endsWith("ي") || raw.length < 5) continue;
        const u = foldArticle(raw);
        if (own.has(u) || nameIndex.idf(u) < 5) continue;
        const alt = group.find((id) => id !== seg.id && units.get(id)?.has(u));
        if (alt) { out.push({ id: seg.id, alt, text: text.slice(seg.s, seg.e) }); break; }
      }
    }
    return out;
  };

  // Hadith sources
  type Pending = { raw: RawHadith; c: CollectionSlug; link: ApiLink | undefined };
  const pending: Pending[] = [];
  for (const c of COLLECTION_SLUGS) {
    const rows = readJson<{ hadiths: RawHadith[] }>(path.join(SRC, "hadiths", `${c}.json`)).hadiths;
    const extFile = path.join(SRC, "external", "hadith-api", `${c}.json`);
    const links = fs.existsSync(extFile) ? readJson<{ matches: Record<string, ApiLink> }>(extFile).matches : {};
    for (const raw of rows) pending.push({ raw, c, link: links[raw.legacy_id] });
  }

  // Flat-chain pairs from texts without a switch, for joining branches.
  const flatPairs = new Map<string, number>();
  for (const { raw } of pending) {
    if (/(^|[\s،,.])ح([\s،,.]|$)/.test(raw.text_ar)) continue;
    for (let j = 0; j + 1 < raw.chain.length; j++) {
      const k = `${raw.chain[j + 1]}>${raw.chain[j]}`;
      flatPairs.set(k, (flatPairs.get(k) ?? 0) + 1);
    }
  }
  const attested = (t: string, s: string) => listed.has(`${t}>${s}`) || (flatPairs.get(`${t}>${s}`) ?? 0) > 0;
  for (const k of [...listed, ...flatPairs.keys()]) {
    const [t, s] = k.split(">");
    if (!work.has(t)) continue;
    const set = teacherCandidates.get(s) ?? new Set<string>();
    set.add(t);
    teacherCandidates.set(s, set);
  }

  // Hadiths: references, text, alignment, graph.
  const hadiths: HadithRecord[] = [];
  const alignments: Alignment[] = [];
  const differs = new Map<string, { id: string; alt: string; text: string }[]>();
  const hiddenFor = new Map<string, string[]>();
  const usedSlugs = new Map<CollectionSlug, Set<string>>();
  let aligned = 0;
  let inChains = 0;
  let inferredCount = 0;
  let prevInCollection: HadithRecord | null = null;
  for (const { raw, c, link } of pending) {
    if (prevInCollection && prevInCollection.c !== c) prevInCollection = null;
    // Sub-numbers (e.g. 402.2) are cited by their whole number; the URL slug
    // tells chains under one number apart with a suffix.
    const std = link ? (c === "muslim" ? muslimRef(link.an) : String(Math.floor(Number(link.n)))) : null;
    const used = usedSlugs.get(c) ?? new Set<string>();
    usedSlugs.set(c, used);
    const base = std ?? `ds${raw.hadith_no.replace(/[^0-9a-z]/gi, "") || "0"}`;
    let slug = base;
    for (let k = 2; used.has(slug); k++) slug = `${base}-${k}`;
    used.add(slug);

    const sourceChain = raw.chain.map(String);
    const alignment = alignChain(raw.text_ar, sourceChain, nameIndex);
    const chain = [...sourceChain, ...alignment.extended];
    alignments.push(alignment);
    inChains += sourceChain.length;
    aligned += alignment.matched.slice(0, sourceChain.length).filter(Boolean).length;
    inferredCount += alignment.extended.length;

    const matn = alignment.matnStart !== null ? raw.text_ar.slice(alignment.matnStart) : "";
    const followUp = Boolean(matn) && isFollowUpText(matn);
    const marfu = alignment.prophet !== null || (followUp && prevInCollection !== null && prevInCollection.graph.nodes.includes(PROPHET_ID));
    const graph = buildGraph({ chain, compilerId: COLLECTIONS[c].compilerId, alignment, marfu, attested, isCompanion });

    const datasetEn = cleanEnglish(raw.text_en);
    const apiEn = cleanEnglish(link?.en);
    const record: HadithRecord = {
      key: `${c}/${slug}`,
      c,
      slug,
      legacyId: raw.legacy_id,
      datasetNo: raw.hadith_no,
      ref: { std, inBook: link?.ref ?? null, usc: raw.usc_msa_ref },
      book: Number(raw.chapter_no) || 0,
      ar: raw.text_ar,
      en: datasetEn ?? apiEn,
      enSource: datasetEn ? "dataset" : apiEn ? "hadith-api" : null,
      segs: alignment.segs,
      prophet: alignment.prophet,
      matnStart: alignment.matnStart,
      chain: sourceChain,
      inferred: alignment.extended,
      graph,
      notes: [],
      grades: link?.grades ?? [],
      cluster: null,
      related: [],
      followUp,
      prev: prevInCollection?.key ?? null,
      next: null,
    };
    if (prevInCollection) prevInCollection.next = record.key;
    for (const [j, names] of alignment.hiddenNames) {
      const teacher = chain[j];
      hiddenFor.set(`${record.key}|${teacher}`, names);
    }
    const nd = nameDiffersFor(raw.text_ar, alignment.segs);
    if (nd.length) differs.set(record.key, nd);
    hadiths.push(record);
    prevInCollection = record;
  }
  console.log(`hadiths: ${hadiths.length}; narrators aligned in text: ${aligned}/${inChains} (${((aligned / inChains) * 100).toFixed(1)}%); inferred from text: ${inferredCount}`);

  // Edge counts across all graphs, and terms received.
  const edgeCount = new Map<string, number>();
  const termCount = new Map<string, Map<TermKey, number>>();
  for (const h of hadiths) {
    const seen = new Set<string>();
    for (const [from, to, term] of h.graph.edges) {
      const k = `${from}>${to}`;
      if (!seen.has(k)) { seen.add(k); edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1); }
      if (term) {
        const m = termCount.get(to) ?? new Map<TermKey, number>();
        m.set(term, (m.get(term) ?? 0) + 1);
        termCount.set(to, m);
      }
    }
  }

  // Appearances and positions.
  const appearances = new Map<string, string[]>();
  const byCollection = new Map<string, Partial<Record<CollectionSlug, number>>>();
  const positions = new Map<string, { source: number; middle: number; compiler: number }>();
  for (const h of hadiths) {
    for (const id of h.graph.nodes) {
      if (id === PROPHET_ID) continue;
      const list = appearances.get(id) ?? [];
      list.push(h.key);
      appearances.set(id, list);
      const bc = byCollection.get(id) ?? {};
      bc[h.c] = (bc[h.c] ?? 0) + 1;
      byCollection.set(id, bc);
    }
    const full = [...h.chain, ...h.inferred];
    full.forEach((id, j) => {
      const p = positions.get(id) ?? { source: 0, middle: 0, compiler: 0 };
      if (j === full.length - 1) p.source++;
      else if (j === 0) p.compiler++;
      else p.middle++;
      positions.set(id, p);
    });
  }
  const prophetCount = hadiths.filter((h) => h.graph.nodes.includes(PROPHET_ID)).length;

  // Summaries.
  const summaries = new Map<string, NarratorSummary>();
  for (const w of work.values()) {
    summaries.set(w.id, {
      id: w.id,
      en: w.name.en,
      ar: w.name.ar,
      h: w.name.honorific,
      g: w.grade,
      cls: w.gen.cls,
      gen: w.gen.generation,
      d: w.death?.ah ?? null,
      n: w.id === PROPHET_ID ? prophetCount : (appearances.get(w.id)?.length ?? 0),
    });
  }

  // Notes.
  for (const h of hadiths) {
    h.notes = chainNotes({
      graph: h.graph,
      chain: [...h.chain, ...h.inferred],
      inferred: h.inferred,
      compilerId: COLLECTIONS[h.c].compilerId,
      marfu: h.graph.nodes.includes(PROPHET_ID),
      followUp: h.followUp,
      narrator: (id) => summaries.get(id),
      edgeInfo: (t, s) => ({ n: edgeCount.get(`${t}>${s}`) ?? 0, listed: listed.has(`${t}>${s}`) }),
      nameDiffers: differs.get(h.key) ?? [],
      hiddenNames: (teacher) => hiddenFor.get(`${h.key}|${teacher}`) ?? [],
    });
  }

  // Relations: listed + chain-derived, identical from both ends.
  const teachersOf = new Map<string, Map<string, NarratorLink>>();
  const studentsOf = new Map<string, Map<string, NarratorLink>>();
  const link = (t: string, s: string) => {
    if (t === s || !work.has(t) || !work.has(s)) return;
    const k = `${t}>${s}`;
    const entry = { n: edgeCount.get(k) ?? 0, listed: listed.has(k) };
    const tm = teachersOf.get(s) ?? new Map<string, NarratorLink>();
    tm.set(t, { id: t, ...entry });
    teachersOf.set(s, tm);
    const sm = studentsOf.get(t) ?? new Map<string, NarratorLink>();
    sm.set(s, { id: s, ...entry });
    studentsOf.set(t, sm);
  };
  for (const k of listed) { const [t, s] = k.split(">"); link(t, s); }
  for (const k of edgeCount.keys()) { const [t, s] = k.split(">"); link(t, s); }
  const sortLinks = (m: Map<string, NarratorLink> | undefined) =>
    [...(m?.values() ?? [])].sort((a, b) => b.n - a.n || Number(b.listed) - Number(a.listed) || (summaries.get(b.id)?.n ?? 0) - (summaries.get(a.id)?.n ?? 0));

  // Same-name groups, most-cited first.
  const sameNameOf = new Map<string, string[]>();
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    const sorted = [...ids].sort((a, b) => (summaries.get(b)?.n ?? 0) - (summaries.get(a)?.n ?? 0));
    for (const id of ids) sameNameOf.set(id, sorted.filter((x) => x !== id));
  }

  // Related reports: matching wording across and within collections.
  // Word sets exclude formulae and very common words; two reports are linked
  // when most of the shorter one's words appear in the other.
  const STOPWORDS = new Set(["صلي", "الله", "عليه", "وسلم", "رسول", "النبي", "قال", "قالت", "يقول", "رضي", "عنه", "عنها", "ان", "في", "من", "عن", "علي", "الي", "ما", "لا", "و", "ثم", "فقال", "كان"]);
  const wordSets: (Set<string> | null)[] = hadiths.map((h) => {
    if (h.followUp || h.matnStart === null) return null;
    const set = new Set(arabicTokens(h.ar.slice(h.matnStart)).filter((t) => !STOPWORDS.has(t)));
    return set.size >= 6 ? set : null;
  });
  const wdf = new Map<string, number>();
  for (const s of wordSets) if (s) for (const x of s) wdf.set(x, (wdf.get(x) ?? 0) + 1);
  const informative = wordSets.map((s) => (s ? new Set([...s].filter((x) => (wdf.get(x) ?? 0) <= 300)) : null));
  const postings = new Map<string, number[]>();
  informative.forEach((s, i) => {
    if (!s || s.size < 6) return;
    for (const x of s) {
      const f = wdf.get(x) ?? 0;
      if (f < 2 || f > 40) continue;
      const p = postings.get(x);
      if (p) p.push(i); else postings.set(x, [i]);
    }
  });
  const uf = new UnionFind();
  const relatedOf = new Map<number, [number, number][]>();
  const relate = (i: number, j: number, score: number) => {
    for (const [a, b] of [[i, j], [j, i]]) {
      const list = relatedOf.get(a) ?? [];
      list.push([b, score]);
      relatedOf.set(a, list);
    }
  };
  informative.forEach((a, i) => {
    if (!a || a.size < 6) return;
    const shared = new Map<number, number>();
    for (const x of a) for (const j of postings.get(x) ?? []) if (j > i) shared.set(j, (shared.get(j) ?? 0) + 1);
    for (const [j, count] of shared) {
      if (count < 3) continue;
      const b = informative[j]!;
      if (b.size < 6 || Math.min(a.size, b.size) / Math.max(a.size, b.size) < 0.25) continue;
      let inter = 0;
      for (const x of a) if (b.has(x)) inter++;
      const overlap = inter / Math.min(a.size, b.size);
      const jac = inter / (a.size + b.size - inter);
      if (overlap >= 0.6 && jac >= 0.3) {
        uf.union(hadiths[i].key, hadiths[j].key);
        relate(i, j, Math.round(jac * 100) / 100);
      }
    }
  });
  // Follow-up chains ("the same as the previous") belong to the report before them.
  hadiths.forEach((h, i) => {
    if (h.followUp && i > 0 && hadiths[i - 1].c === h.c) {
      uf.union(hadiths[i - 1].key, h.key);
      relate(i - 1, i, 1);
    }
  });
  hadiths.forEach((h, i) => {
    h.related = (relatedOf.get(i) ?? []).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([j, sc]) => [hadiths[j].key, sc]);
  });
  const clusterMembers = new Map<string, string[]>();
  for (const h of hadiths) {
    const root = uf.find(h.key);
    const list = clusterMembers.get(root) ?? [];
    list.push(h.key);
    clusterMembers.set(root, list);
  }
  const clusters: Record<string, string[]> = {};
  const byKey = new Map(hadiths.map((h) => [h.key, h]));
  for (const members of clusterMembers.values()) {
    if (members.length < 2) continue;
    const id = members[0];
    clusters[id] = members;
    for (const k of members) byKey.get(k)!.cluster = id;
  }
  const clusterSizes = Object.values(clusters).map((m) => m.length);
  console.log(`related groups: ${clusterSizes.length} (largest ${Math.max(0, ...clusterSizes)}), hadiths in groups: ${clusterSizes.reduce((a, b) => a + b, 0)}`);

  // ------------------------------------------------------------ write
  fs.mkdirSync(OUT, { recursive: true });

  // Hadiths by collection and book.
  const collectionSummaries: CollectionSummary[] = [];
  const legacy: Record<string, string> = {};
  for (const c of COLLECTION_SLUGS) {
    const list = hadiths.filter((h) => h.c === c);
    const books = new Map<number, HadithRecord[]>();
    for (const h of list) {
      const b = books.get(h.book) ?? [];
      b.push(h);
      books.set(h.book, b);
      legacy[h.legacyId] = h.key;
    }
    const bookSummaries: BookSummary[] = [];
    const locator: Record<string, number> = {};
    const titleOf = new Map<number, string>();
    for (const raw of pending) if (raw.c === c && !titleOf.has(Number(raw.raw.chapter_no) || 0)) titleOf.set(Number(raw.raw.chapter_no) || 0, raw.raw.chapter);
    for (const [n, recs] of [...books.entries()].sort((a, b) => a[0] - b[0])) {
      const title = splitTitle(titleOf.get(n) ?? "");
      const summary: BookSummary = { n, en: title.en, ar: title.ar, count: recs.length, first: recs[0].slug, last: recs[recs.length - 1].slug };
      bookSummaries.push(summary);
      for (const r of recs) locator[r.slug] = n;
      writeJson(`hadiths/${c}/${n}.json`, { book: summary, hadiths: recs });
    }
    writeJson(`hadiths/${c}/index.json`, { books: locator });
    collectionSummaries.push({
      slug: c,
      count: list.length,
      graded: list.filter((h) => h.grades.length).length,
      matched: list.filter((h) => h.ref.std).length,
      translated: list.filter((h) => h.en).length,
      books: bookSummaries,
    });
    const rows: HadithSearchRow[] = list.map((h) => [
      h.key,
      normalizeForSearch(`${h.ar} ${h.en ?? ""}`),
      h.en ? snippet(h.en) : "",
      snippet(h.matnStart !== null ? h.ar.slice(h.matnStart) : h.ar),
      h.book,
    ]);
    writeJson(`search/hadiths-${c}.json`, rows);
  }
  writeJson("collections.json", collectionSummaries);
  writeJson("legacy.json", legacy);
  writeJson("clusters.json", clusters);

  // Narrators.
  const index: NarratorIndexRow[] = [];
  const shards: Record<string, NarratorRecord>[] = Array.from({ length: NARRATOR_SHARDS }, () => ({}));
  for (const w of work.values()) {
    const s = summaries.get(w.id)!;
    index.push([s.id, s.en, s.ar, s.h, s.g, s.cls, s.gen, s.d, s.n]);
    const same = sameNameOf.get(w.id) ?? [];
    const record: NarratorRecord = {
      ...s,
      arFull: w.name.arFull,
      legacyName: w.legacyName,
      verdictAr: w.verdictAr,
      books: w.books,
      century: w.gen.century,
      madhhab: w.gen.madhhab,
      nonMuslim: w.gen.nonMuslim,
      birth: w.birth,
      death: w.death,
      places: w.places,
      tags: w.tags,
      interests: w.interests,
      family: w.family,
      teachers: sortLinks(teachersOf.get(w.id)),
      students: sortLinks(studentsOf.get(w.id)),
      stats: {
        byCollection: byCollection.get(w.id) ?? {},
        positions: positions.get(w.id) ?? { source: 0, middle: 0, compiler: 0 },
        termsReceived: Object.fromEntries(termCount.get(w.id) ?? []),
      },
      sameName: same.slice(0, 12),
      sameNameTotal: same.length,
      hadiths: w.id === PROPHET_ID ? [] : appearances.get(w.id) ?? [],
    };
    shards[Number(w.id) % NARRATOR_SHARDS][w.id] = record;
  }
  index.sort((a, b) => b[8] - a[8] || Number(a[0]) - Number(b[0]));
  writeJson("narrators/index.json", index);
  shards.forEach((shard, i) => writeJson(`narrators/${i}.json`, shard));

  // Transmission edges for the path finder.
  const edgeRows: EdgeRow[] = [];
  const allEdges = new Set([...listed, ...edgeCount.keys()]);
  for (const k of allEdges) {
    const [t, s] = k.split(">");
    if (!work.has(t) || !work.has(s)) continue;
    edgeRows.push([t, s, edgeCount.get(k) ?? 0, listed.has(k) ? 1 : 0]);
  }
  writeJson("graph/edges.json", edgeRows);

  // ------------------------------------------------------------ validate
  const unresolved = new Set<string>();
  for (const h of hadiths) for (const id of h.chain) if (!work.has(id)) unresolved.add(id);
  let asymmetric = 0;
  for (const [s, tm] of teachersOf) for (const t of tm.keys()) if (!studentsOf.get(t)?.has(s)) asymmetric++;
  const namesWithHonorificText = [...work.values()].filter((w) => /رضي الله عنه|رضى الله عنه/.test(`${w.name.ar} ${w.name.arFull}`)).length;
  const prophet = work.get(PROPHET_ID);
  const prophetOk = prophet && prophet.grade === "prophet" && prophet.name.honorific === "saw" ? 1 : 0;
  const garbled = hadiths.filter((h) => h.en && (GARBLED.test(h.en) || /[ء-ي]{3,}/.test(h.en))).length;
  const slugCount = new Set(hadiths.map((h) => h.key)).size;
  const graded = hadiths.filter((h) => h.grades.length).length;
  const matched = hadiths.filter((h) => h.ref.std).length;
  const alignedShare = inChains ? aligned / inChains : 1;
  const checks = [
    { name: "narrators", value: work.size, limit: 24000, ok: work.size >= 24000 },
    { name: "hadith records", value: hadiths.length, limit: 34000, ok: hadiths.length >= 34000 },
    { name: "duplicate hadith keys", value: hadiths.length - slugCount, limit: 0, ok: hadiths.length === slugCount },
    { name: "unresolved chain IDs", value: unresolved.size, limit: 600, ok: unresolved.size <= 600 },
    { name: "one-sided teacher/student links", value: asymmetric, limit: 0, ok: asymmetric === 0 },
    { name: "honorific text left inside names", value: namesWithHonorificText, limit: 0, ok: namesWithHonorificText === 0 },
    { name: "Prophet ﷺ record correct", value: prophetOk, limit: 1, ok: prophetOk === 1 },
    { name: "garbled English translations", value: garbled, limit: 0, ok: garbled === 0 },
    { name: "hadiths with published gradings", value: graded, limit: 18000, ok: graded >= 18000 },
    { name: "hadiths matched to a standard reference", value: matched, limit: 32000, ok: matched >= 32000 },
    { name: "share of chain narrators found in the text (per mille)", value: Math.round(alignedShare * 1000), limit: 800, ok: alignedShare >= 0.8 },
  ];

  const meta: BuildMeta = {
    builtAt: new Date().toISOString(),
    sourceHash,
    counts: {
      narrators: work.size,
      hadiths: hadiths.length,
      byCollection: Object.fromEntries(COLLECTION_SLUGS.map((c) => [c, hadiths.filter((h) => h.c === c).length])) as Record<CollectionSlug, number>,
      graded,
      matchedToStandard: matched,
      withEnglish: hadiths.filter((h) => h.en).length,
      clusters: clusterSizes.length,
      clusteredHadiths: clusterSizes.reduce((a, b) => a + b, 0),
      edges: edgeRows.length,
      inferred: inferredCount,
      withGaps: hadiths.filter((h) => h.graph.gaps.some(([from]) => from !== PROPHET_ID)).length,
      withDeathYear: [...work.values()].filter((w) => w.death?.ah !== null && w.death?.ah !== undefined).length,
    },
    alignment: { narratorsAligned: aligned, narratorsInChains: inChains },
    validation: { checks },
  };
  writeJson("meta.json", meta);

  for (const c of checks) console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}: ${c.value} (limit ${c.limit})`);
  console.log(`built in ${((Date.now() - started) / 1000).toFixed(1)}s → ${path.relative(ROOT, OUT)}`);
  if (checks.some((c) => !c.ok)) {
    fs.rmSync(metaFile);
    console.error("Data validation failed.");
    process.exit(1);
  }
}

main();
