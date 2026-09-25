// Shapes of the files the data build writes to data/build/ and the app and
// API read. Keys are kept short where records are repeated thousands of times.
import type { CollectionSlug } from "../collections";
import type { GradeKey } from "../vocab/grades";
import type { Madhhab, NarratorClass } from "../vocab/generations";
import type { TermKey } from "../vocab/terms";

/** saw: ﷺ · ra/raha: may Allah be pleased with him/her · as: peace be upon him */
export type Honorific = "saw" | "ra" | "raha" | "as" | null;

/** Resolved everywhere a narrator is mentioned. */
export interface NarratorSummary {
  id: string;
  en: string;
  ar: string;
  h: Honorific;
  g: GradeKey;
  cls: NarratorClass;
  gen: number | null;
  /** Death year, AH. */
  d: number | null;
  /** Number of hadith records whose chain includes this narrator. */
  n: number;
}

/** Tuple form of NarratorSummary used in narrators/index.json. */
export type NarratorIndexRow = [id: string, en: string, ar: string, h: Honorific, g: GradeKey, cls: NarratorClass, gen: number | null, d: number | null, n: number];

export interface NarratorLink {
  id: string;
  /** Hadith records in which this link occurs. */
  n: number;
  /** Whether the source's teacher/student lists record the link. */
  listed: boolean;
}

export interface LifeEvent {
  ah: number | null;
  ce: number | null;
  place: string | null;
  placeKeys: string[];
}

export interface NarratorRecord extends NarratorSummary {
  arFull: string;
  legacyName: string;
  /** Arabic verdict wording recorded in the source, e.g. "ثقة ثبت". */
  verdictAr: string | null;
  /** Taqrib-style symbols of the books the narrator appears in, e.g. "خ م د". */
  books: string | null;
  century: number | null;
  madhhab: Madhhab | null;
  nonMuslim: boolean;
  birth: LifeEvent | null;
  death: (LifeEvent & { martyred: boolean }) | null;
  places: { key: string | null; raw: string }[];
  tags: string[];
  interests: string[];
  family: { parents: string[]; spouses: string[]; siblings: string[]; children: string[] };
  teachers: NarratorLink[];
  students: NarratorLink[];
  stats: {
    byCollection: Partial<Record<CollectionSlug, number>>;
    /** Where the narrator sits in chains: next to the Prophet ﷺ, in between, next to the compiler. */
    positions: { source: number; middle: number; compiler: number };
    /** How they received reports: the transmission word on links into them. */
    termsReceived: Partial<Record<TermKey, number>>;
  };
  /** Others with the same first and father's name, most-cited first. */
  sameName: string[];
  sameNameTotal: number;
  /** Keys of every hadith record featuring the narrator, in collection order. */
  hadiths: string[];
}

export interface HadithSegment {
  /** Start and end offsets in the Arabic text. */
  s: number;
  e: number;
  id: string;
  term: TermKey | null;
}

export interface ChainGraph {
  nodes: string[];
  /** Teacher → student, with the transmission word when known. */
  edges: [from: string, to: string, term: TermKey | null][];
  /** Links with someone missing in between: the text names narrators the
   *  dataset does not identify, or a Successor's report reaches the Prophet ﷺ. */
  gaps: [from: string, to: string][];
  branched: boolean;
  /** Some branch junctions were inferred rather than read from the text. */
  uncertain: boolean;
}

export type NoteKind =
  | "grade"
  | "no-grade"
  | "unidentified"
  | "gen-gap"
  | "gen-order"
  | "death-gap"
  | "death-order"
  | "unattested"
  | "no-chain"
  | "branched"
  | "uncertain-branch"
  | "not-marfu"
  | "follow-up"
  | "name-differs"
  | "hidden-narrators"
  | "source-not-companion"
  | "inferred";

export interface ChainNote {
  kind: NoteKind;
  ids: string[];
  data?: Record<string, string | number>;
}

export interface HadithRecord {
  /** "{collection}/{slug}", e.g. "muslim/1907a". */
  key: string;
  c: CollectionSlug;
  slug: string;
  legacyId: string;
  datasetNo: string;
  ref: {
    /** Standard reference number, when the text was matched to one. */
    std: string | null;
    inBook: [book: number, hadith: number] | null;
    usc: string | null;
  };
  book: number;
  ar: string;
  en: string | null;
  enSource: "dataset" | "hadith-api" | null;
  segs: HadithSegment[];
  prophet: [start: number, end: number] | null;
  matnStart: number | null;
  /** The source's flat chain, compiler side first. */
  chain: string[];
  /** Narrators appended from the text where the source's chain stops short;
   *  each matches exactly one known teacher of the narrator before it. */
  inferred: string[];
  graph: ChainGraph;
  notes: ChainNote[];
  grades: [grader: string, grade: string][];
  /** Wider group of related reports (connected by matching wording). */
  cluster: string | null;
  /** Reports whose wording closely matches this one, with a 0–1 score. */
  related: [key: string, score: number][];
  followUp: boolean;
  prev: string | null;
  next: string | null;
}

export interface BookSummary {
  n: number;
  en: string;
  ar: string;
  count: number;
  first: string;
  last: string;
}

export interface CollectionSummary {
  slug: CollectionSlug;
  count: number;
  graded: number;
  matched: number;
  translated: number;
  books: BookSummary[];
}

export interface HadithLocator {
  /** slug → book number */
  books: Record<string, number>;
}

/** Row of search/hadiths-{collection}.json. */
export type HadithSearchRow = [key: string, text: string, snippetEn: string, snippetAr: string, book: number];

/** Row of graph/edges.json: teacher, student, hadith records, listed (1/0). */
export type EdgeRow = [from: string, to: string, n: number, listed: 0 | 1];

export interface BuildMeta {
  builtAt: string;
  sourceHash: string;
  counts: {
    narrators: number;
    hadiths: number;
    byCollection: Record<CollectionSlug, number>;
    graded: number;
    matchedToStandard: number;
    withEnglish: number;
    clusters: number;
    clusteredHadiths: number;
    edges: number;
    /** Narrators added to chains from the text. */
    inferred: number;
    /** Hadith records whose chain has a link with an unidentified narrator in between. */
    withGaps: number;
    /** Narrators with a known death year. */
    withDeathYear: number;
  };
  alignment: { narratorsAligned: number; narratorsInChains: number };
  validation: { checks: { name: string; value: number; limit: number; ok: boolean }[] };
}
