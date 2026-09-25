// Server-side search over the build's narrator index and hadith corpora.
import "server-only";
import { COLLECTION_SLUGS, type CollectionSlug } from "../collections";
import { arabicTokens, latinTokens } from "../text/normalize";
import { parseReference, queryTokens } from "../search/query";
import { getHadith, getNarratorIndex, getSearchRows } from "./server";
import type { NarratorSummary } from "./types";

export interface HadithHit {
  key: string;
  snippetEn: string;
  snippetAr: string;
  book: number;
  score: number;
}

let narratorTokens: { id: string; en: string[]; ar: string[] }[] | null = null;

function narratorTokenIndex() {
  if (!narratorTokens) {
    narratorTokens = getNarratorIndex().rows.map(([id, en, ar]) => ({ id, en: latinTokens(en), ar: arabicTokens(ar) }));
  }
  return narratorTokens;
}

export function searchNarrators(q: string, limit = 20): NarratorSummary[] {
  const { byId, rows } = getNarratorIndex();
  const tokens = queryTokens(q, { stripPrefixes: false });
  if (/^\d+$/.test(q.trim())) {
    const direct = byId.get(q.trim());
    return direct ? [direct] : [];
  }
  if (!tokens.length) return rows.slice(0, limit).map(([id]) => byId.get(id)!);
  const scored: { id: string; score: number }[] = [];
  for (const entry of narratorTokenIndex()) {
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const pool = /[؀-ۿ]/.test(t) ? entry.ar : entry.en;
      let best = 0;
      for (let i = 0; i < pool.length; i++) {
        const w = pool[i];
        if (w === t) { best = Math.max(best, i === 0 ? 4 : 3); break; }
        if (w.startsWith(t)) best = Math.max(best, i === 0 ? 2.5 : 2);
        else if (t.length > 2 && w.includes(t)) best = Math.max(best, 1);
      }
      if (!best) { ok = false; break; }
      score += best;
    }
    if (!ok) continue;
    const s = byId.get(entry.id)!;
    scored.push({ id: entry.id, score: score + Math.log10(1 + s.n) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => byId.get(x.id)!);
}

export interface HadithSearchResult {
  reference: string | null;
  hits: HadithHit[];
  total: number;
}

export function searchHadiths(q: string, opts: { collection?: CollectionSlug; limit?: number; offset?: number } = {}): HadithSearchResult {
  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = Math.max(opts.offset ?? 0, 0);
  const ref = parseReference(q);
  if (ref) {
    const h = getHadith(ref.collection, ref.number);
    if (h) {
      return {
        reference: h.key,
        total: 1,
        hits: [{ key: h.key, snippetEn: h.en?.slice(0, 180) ?? "", snippetAr: h.ar.slice(h.matnStart ?? 0, (h.matnStart ?? 0) + 180), book: h.book, score: 100 }],
      };
    }
  }
  const tokens = queryTokens(q);
  if (!tokens.length) return { reference: null, hits: [], total: 0 };
  const collections = opts.collection ? [opts.collection] : [...COLLECTION_SLUGS];
  const hits: HadithHit[] = [];
  for (const c of collections) {
    for (const [key, text, snippetEn, snippetAr, book] of getSearchRows(c)) {
      let score = 0;
      for (const t of tokens) {
        const arabic = /[؀-ۿ]/.test(t);
        const at = arabic ? text.indexOf(t) : text.indexOf(` ${t}`) >= 0 ? text.indexOf(` ${t}`) : text.startsWith(t) ? 0 : -1;
        if (at < 0) { score = 0; break; }
        score += 1 + (snippetEn.toLowerCase().includes(t) || snippetAr.includes(t) ? 0.5 : 0);
      }
      if (score > 0) hits.push({ key, snippetEn, snippetAr, book, score });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return { reference: null, total: hits.length, hits: hits.slice(offset, offset + limit) };
}
