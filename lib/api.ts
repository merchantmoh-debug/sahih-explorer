// Public JSON API helpers: stable, readable shapes for /api/v1.
import "server-only";
import { COLLECTIONS } from "./collections";
import { getBookSummary, summaries } from "./data/server";
import type { HadithRecord, NarratorRecord, NarratorSummary } from "./data/types";
import { GRADES } from "./vocab/grades";

export const API_VERSION = "v1";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: HEADERS });
}

export function apiError(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: { ...HEADERS, "Cache-Control": "no-store" } });
}

export function options(): Response {
  return new Response(null, { status: 204, headers: HEADERS });
}

export function publicNarrator(n: NarratorSummary) {
  return {
    id: n.id,
    name: { en: n.en, ar: n.ar },
    honorific: n.h,
    grade: { key: n.g, label: GRADES[n.g].label.en, term: GRADES[n.g].term || null },
    class: n.cls,
    generation: n.gen,
    deathAH: n.d,
    hadithCount: n.n,
    url: `/en/scholar/${n.id}`,
  };
}

export function publicHadithSummary(h: HadithRecord) {
  return {
    key: h.key,
    collection: h.c,
    number: h.slug,
    reference: h.ref.std ? `${COLLECTIONS[h.c].name.en} ${h.ref.std}` : null,
    book: h.book,
    textEn: h.en ? h.en.slice(0, 240) : null,
    textAr: h.ar.slice(h.matnStart ?? 0, (h.matnStart ?? 0) + 240),
    grades: h.grades.map(([grader, grade]) => ({ grader, grade })),
    url: `/en/${h.c}/${h.slug}`,
  };
}

export function publicHadith(h: HadithRecord) {
  const ids = new Set<string>([...h.graph.nodes, ...h.chain, ...h.inferred]);
  for (const n of h.notes) n.ids.forEach((id) => ids.add(id));
  const book = getBookSummary(h.c, h.book);
  return {
    key: h.key,
    collection: { slug: h.c, name: COLLECTIONS[h.c].name },
    number: h.slug,
    reference: {
      standard: h.ref.std,
      citation: h.ref.std ? `${COLLECTIONS[h.c].name.en} ${h.ref.std}` : null,
      inBook: h.ref.inBook ? { book: h.ref.inBook[0], hadith: h.ref.inBook[1] } : null,
      uscMsa: h.ref.usc,
      datasetNumber: h.datasetNo,
      sourceId: h.legacyId,
    },
    book: book ? { number: book.n, title: { en: book.en, ar: book.ar } } : { number: h.book },
    text: { ar: h.ar, en: h.en, enSource: h.enSource, matnStart: h.matnStart },
    mentions: h.segs.map((s) => ({ start: s.s, end: s.e, narrator: s.id, term: s.term })),
    prophetMention: h.prophet ? { start: h.prophet[0], end: h.prophet[1] } : null,
    chain: {
      listed: h.chain,
      inferredFromText: h.inferred,
      edges: h.graph.edges.map(([from, to, term]) => ({ from, to, term })),
      gaps: h.graph.gaps.map(([from, to]) => ({ from, to })),
      branched: h.graph.branched,
      uncertain: h.graph.uncertain,
    },
    notes: h.notes,
    grades: h.grades.map(([grader, grade]) => ({ grader, grade })),
    related: h.related.map(([key, score]) => ({ key, score })),
    group: h.cluster,
    followUp: h.followUp,
    previous: h.prev,
    next: h.next,
    narrators: Object.fromEntries(Object.entries(summaries(ids)).map(([id, s]) => [id, publicNarrator(s)])),
    url: `/en/${h.c}/${h.slug}`,
  };
}

export function publicNarratorRecord(n: NarratorRecord) {
  const related = new Set<string>([
    ...n.teachers.map((t) => t.id), ...n.students.map((s) => s.id), ...n.sameName,
    ...n.family.parents, ...n.family.children, ...n.family.siblings, ...n.family.spouses,
  ]);
  return {
    ...publicNarrator(n),
    fullArabicName: n.arFull,
    verdictAr: n.verdictAr,
    books: n.books,
    century: n.century,
    madhhab: n.madhhab,
    birth: n.birth,
    death: n.death,
    places: n.places,
    tags: n.tags,
    interests: n.interests,
    family: n.family,
    teachers: n.teachers,
    students: n.students,
    stats: n.stats,
    sameName: n.sameName,
    hadiths: { count: n.hadiths.length, url: `/api/v1/narrators/${n.id}/hadiths` },
    names: Object.fromEntries(Object.entries(summaries(related)).map(([id, s]) => [id, { en: s.en, ar: s.ar, grade: s.g, deathAH: s.d }])),
  };
}
