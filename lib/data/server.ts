// Server-side access to data/build. Files are gzipped JSON written by
// scripts/data/build.ts; parsed files are cached per server instance.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { COLLECTION_SLUGS, type CollectionSlug } from "../collections";
import type {
  BuildMeta, CollectionSummary, EdgeRow, HadithLocator, HadithRecord, HadithSearchRow,
  NarratorIndexRow, NarratorRecord, NarratorSummary, BookSummary,
} from "./types";

const DIR = path.join(process.cwd(), "data", "build");
const NARRATOR_SHARDS = 64;

function read<T>(rel: string): T | null {
  const file = path.join(DIR, `${rel}.json.gz`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8")) as T;
}

/** Small LRU so that books and shards read on busy pages stay parsed. */
class Lru<V> {
  private map = new Map<string, V>();
  constructor(private max: number) {}
  get(key: string, load: () => V): V {
    const hit = this.map.get(key);
    if (hit !== undefined) {
      this.map.delete(key);
      this.map.set(key, hit);
      return hit;
    }
    const value = load();
    this.map.set(key, value);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
    return value;
  }
}

const once = new Map<string, unknown>();
function memo<T>(key: string, load: () => T): T {
  if (!once.has(key)) once.set(key, load());
  return once.get(key) as T;
}

export function isCollectionSlug(value: string): value is CollectionSlug {
  return (COLLECTION_SLUGS as readonly string[]).includes(value);
}

export function isNarratorId(value: string): boolean {
  return /^\d{1,6}$/.test(value);
}

export function getMeta(): BuildMeta {
  const meta = memo("meta", () => read<BuildMeta>("meta"));
  if (!meta) throw new Error("data/build is missing. Run `npm run data:build`.");
  return meta;
}

export function getCollections(): CollectionSummary[] {
  return memo("collections", () => read<CollectionSummary[]>("collections") ?? []);
}

export function getCollection(slug: CollectionSlug): CollectionSummary | undefined {
  return getCollections().find((c) => c.slug === slug);
}

export function getBookSummary(slug: CollectionSlug, book: number): BookSummary | undefined {
  return getCollection(slug)?.books.find((b) => b.n === book);
}

// ---------------------------------------------------------------- narrators

interface NarratorIndex {
  rows: NarratorIndexRow[];
  byId: Map<string, NarratorSummary>;
}

export function getNarratorIndex(): NarratorIndex {
  return memo("narrator-index", () => {
    const rows = read<NarratorIndexRow[]>("narrators/index") ?? [];
    const byId = new Map<string, NarratorSummary>();
    for (const [id, en, ar, h, g, cls, gen, d, n] of rows) byId.set(id, { id, en, ar, h, g, cls, gen, d, n });
    return { rows, byId };
  });
}

export function getNarratorSummary(id: string): NarratorSummary | undefined {
  return getNarratorIndex().byId.get(id);
}

/** Summaries for many IDs, skipping unknown ones. */
export function summaries(ids: Iterable<string>): Record<string, NarratorSummary> {
  const out: Record<string, NarratorSummary> = {};
  const { byId } = getNarratorIndex();
  for (const id of ids) {
    const s = byId.get(id);
    if (s) out[id] = s;
  }
  return out;
}

const shards = new Lru<Record<string, NarratorRecord>>(16);

export function getNarrator(id: string): NarratorRecord | null {
  if (!isNarratorId(id)) return null;
  const shard = shards.get(String(Number(id) % NARRATOR_SHARDS), () => read<Record<string, NarratorRecord>>(`narrators/${Number(id) % NARRATOR_SHARDS}`) ?? {});
  return shard[id] ?? null;
}

// ---------------------------------------------------------------- hadiths

const books = new Lru<{ book: BookSummary; hadiths: HadithRecord[] } | null>(48);

export function getBook(slug: CollectionSlug, book: number) {
  if (!Number.isInteger(book) || book < 0) return null;
  return books.get(`${slug}/${book}`, () => read<{ book: BookSummary; hadiths: HadithRecord[] }>(`hadiths/${slug}/${book}`));
}

function locator(slug: CollectionSlug): HadithLocator {
  return memo(`locator-${slug}`, () => read<HadithLocator>(`hadiths/${slug}/index`) ?? { books: {} });
}

export function getHadith(slug: CollectionSlug, number: string): HadithRecord | null {
  const book = locator(slug).books[number];
  if (book === undefined) return null;
  return getBook(slug, book)?.hadiths.find((h) => h.slug === number) ?? null;
}

/** Every hadith key ("{collection}/{slug}") in a collection. */
export function getHadithKeys(slug: CollectionSlug): string[] {
  return Object.keys(locator(slug).books).map((n) => `${slug}/${n}`);
}

export function getHadithByKey(key: string): HadithRecord | null {
  const [slug, number] = key.split("/");
  return isCollectionSlug(slug) && number ? getHadith(slug, number) : null;
}

export function getHadiths(keys: string[]): HadithRecord[] {
  return keys.map(getHadithByKey).filter((h): h is HadithRecord => h !== null);
}

export function getCluster(id: string): string[] {
  const clusters = memo("clusters", () => read<Record<string, string[]>>("clusters") ?? {});
  return clusters[id] ?? [];
}

export function resolveLegacyHadith(legacyId: string): string | null {
  const legacy = memo("legacy", () => read<Record<string, string>>("legacy") ?? {});
  return legacy[legacyId] ?? null;
}

export function getSearchRows(slug: CollectionSlug): HadithSearchRow[] {
  return memo(`search-${slug}`, () => read<HadithSearchRow[]>(`search/hadiths-${slug}`) ?? []);
}

// ---------------------------------------------------------------- graph

export interface Adjacency {
  students: Map<string, { id: string; n: number; listed: boolean }[]>;
  teachers: Map<string, { id: string; n: number; listed: boolean }[]>;
}

export function getAdjacency(): Adjacency {
  return memo("adjacency", () => {
    const rows = read<EdgeRow[]>("graph/edges") ?? [];
    const students: Adjacency["students"] = new Map();
    const teachers: Adjacency["teachers"] = new Map();
    for (const [t, s, n, listed] of rows) {
      const a = students.get(t) ?? [];
      a.push({ id: s, n, listed: listed === 1 });
      students.set(t, a);
      const b = teachers.get(s) ?? [];
      b.push({ id: t, n, listed: listed === 1 });
      teachers.set(s, b);
    }
    return { students, teachers };
  });
}
