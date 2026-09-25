import type { MetadataRoute } from "next";
import { COLLECTION_SLUGS } from "@/lib/collections";
import { getCollections, getHadithKeys, getNarratorIndex } from "@/lib/data/server";
import { SITE_URL } from "@/lib/site";

// Sitemap 0 lists pages, collections and books; the rest list narrators and
// hadith in chunks of CHUNK records. Each record appears once per language
// (30,000 URLs per file at most, under the 50,000 limit); the pages
// themselves carry the hreflang links between languages.
const CHUNK = 10000;
const LOCALES = ["en", "ar", "ckb"] as const;
type Entry = MetadataRoute.Sitemap[number];

function entries(path: string, priority: number, changeFrequency: Entry["changeFrequency"] = "monthly"): Entry[] {
  return LOCALES.map((l) => ({ url: `${SITE_URL}/${l}${path}`, changeFrequency, priority }));
}

function hadithKeys(): string[] {
  return COLLECTION_SLUGS.flatMap((c) => getHadithKeys(c));
}

function narratorChunks(): number {
  return Math.ceil(getNarratorIndex().rows.length / CHUNK);
}

export async function generateSitemaps() {
  const total = 1 + narratorChunks() + Math.ceil(hadithKeys().length / CHUNK);
  return Array.from({ length: total }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const n = Number(await props.id);
  if (n === 0) {
    const pages = ["", "/collections", "/connect", "/glossary", "/about", "/developers"].flatMap((p) => entries(p, p ? 0.6 : 1, "weekly"));
    const collections = getCollections().flatMap((c) => [...entries(`/${c.slug}`, 0.8), ...c.books.flatMap((b) => entries(`/${c.slug}/book/${b.n}`, 0.6))]);
    return [...pages, ...collections];
  }
  const nc = narratorChunks();
  if (n <= nc) {
    return getNarratorIndex().rows.slice((n - 1) * CHUNK, n * CHUNK).flatMap((row) => entries(`/scholar/${row[0]}`, row[8] > 50 ? 0.7 : 0.4));
  }
  const i = n - nc - 1;
  return hadithKeys().slice(i * CHUNK, (i + 1) * CHUNK).flatMap((key) => entries(`/${key}`, 0.8, "yearly"));
}
