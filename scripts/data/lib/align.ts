/**
 * Aligns a hadith's flat chain of narrator IDs with the Arabic text of its
 * isnad: finds where each narrator is named, the transmission word used
 * before them, narrators cited together, switches between chains (ح), names
 * the dataset does not link, and where the Prophet ﷺ is mentioned.
 *
 * Alignment is monotonic (names appear in chain order) and scored by how
 * distinctive the shared name words are. Where the dataset's chain stops
 * short of names that follow in the text, it is extended only when the next
 * name matches exactly one known teacher of the last narrator.
 */
import { normalizeArabic } from "../../../lib/text/normalize";
import { TERM_BY_TOKEN, PLURAL_MARKERS, type TermKey } from "../../../lib/vocab/terms";
import type { HadithSegment } from "../../../lib/data/types";
import { foldArticle } from "./names";

export interface NameIndex {
  units(id: string): Set<string> | undefined;
  idf(unit: string): number;
  /** Whether the word occurs in any narrator's name. */
  known(unit: string): boolean;
  parents(id: string): Set<string>;
  /** Teachers of a narrator attested in the source lists or other chains. */
  teachers(id: string): string[];
  isCompanion(id: string): boolean;
  firstUnits: Set<string>;
}

export interface Alignment {
  /** Narrators appended from the text after the dataset's chain ended. */
  extended: string[];
  segs: HadithSegment[];
  /** Per index of chain + extended. */
  matched: boolean[];
  termBefore: (TermKey | null)[];
  /** Names in the text between this narrator and the one cited before them
   *  that are not linked to anyone. */
  hiddenBefore: number[];
  /** The text of those names, per index. */
  hiddenNames: Map<number, string[]>;
  /** Chain indices i with a switch (ح) between chain[i] and chain[i + 1]. */
  switches: number[];
  switchUncertain: boolean;
  /** Chain indices named right after a word such as قالا ("both said"). */
  sharedAfterPlural: Set<number>;
  /** Ranges [a, b] of chain indices cited together ("X and Y said"). */
  coGroups: [number, number][];
  prophet: [number, number] | null;
  prophetTerm: TermKey | null;
  matnStart: number | null;
}

type TokType = "word" | "term" | "switch" | "honor" | "salawat" | "plural";
interface Tok { norm: string; s: number; e: number; type: TokType; boundaryBefore: boolean; term?: TermKey }
interface Window { toks: Tok[]; units: string[]; joined: boolean; start: number }

const WORD = /[ء-يً-ٰٟـٱ-ۓ]+/g;
const JOINERS = new Set(["عبد", "ابو", "ابي", "ابا", "ام"]);
const KIN_FATHER = new Set(["ابي", "ابيه", "ابوه", "ابيها", "والده", "ابيهما"]);
const KIN_OTHER = new Set(["جده", "جدي", "جدها", "امه", "امي", "امها", "عمه", "عمي", "اخيه", "اخي", "اخوه", "خاله", "خالي", "مولاه", "مولاي", "زوجها"]);
const CLARIFY = new Set(["هو", "وهو", "هي", "وهي", "يعني", "اي", "قراءه", "وانا"]);
const PROPHET_WORDS = new Set(["رسول", "لرسول", "برسول", "النبي", "للنبي", "بالنبي"]);
const THRESHOLD = 2;
const MAX_NAME_WORDS = 7;
/** Names after the text first mentions the Prophet ﷺ are usually part of the
 *  narrative, not the chain. */
const NARRATIVE_WEIGHT = 0.3;
const isKin = (u: string) => KIN_FATHER.has(u) || KIN_OTHER.has(u);

function tokenize(text: string): Tok[] {
  const toks: Tok[] = [];
  let prevEnd = 0;
  for (const m of text.matchAll(WORD)) {
    const s = m.index ?? 0;
    const norm = normalizeArabic(m[0]).replace(/[^ء-ي]/g, "");
    if (!norm) continue;
    toks.push({ norm, s, e: s + m[0].length, type: "word", boundaryBefore: /[،,.؛:"«»؟?!]/.test(text.slice(prevEnd, s)) });
    prevEnd = s + m[0].length;
  }
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const n = t.norm;
    if (t.type !== "word") continue;
    if (n === "ح") t.type = "switch";
    else if (n === "رضي" && toks[i + 1]?.norm === "الله") {
      t.type = "honor";
      toks[i + 1].type = "honor";
      let j = i + 2;
      if (toks[j]?.norm === "تعالي") toks[j++].type = "honor";
      if (toks[j] && /^عن(ه|ها|هما|هم)$/.test(toks[j].norm)) toks[j].type = "honor";
    } else if (n === "صلي" && toks[i + 1]?.norm === "الله" && toks[i + 2]?.norm === "عليه") {
      for (let j = i; j <= i + 3 && j < toks.length; j++) toks[j].type = "salawat";
    } else if (n === "عليه" && toks[i + 1]?.norm === "السلام") {
      t.type = "honor";
      toks[i + 1].type = "honor";
    } else if (PLURAL_MARKERS.has(n)) {
      t.type = "plural";
      t.term = TERM_BY_TOKEN[n];
    } else if (TERM_BY_TOKEN[n]) {
      t.type = "term";
      t.term = TERM_BY_TOKEN[n];
    }
  }
  return toks;
}

function toUnits(toks: Tok[], firstUnits: Set<string>): string[] {
  const units: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    let n = toks[i].norm;
    if (i === 0 && n.length > 3 && n.startsWith("و") && firstUnits.has(n.slice(1))) n = n.slice(1);
    if (JOINERS.has(n) && i + 1 < toks.length) {
      const head = n === "ابي" || n === "ابا" ? "ابو" : n;
      n = head + foldArticle(toks[++i].norm);
    }
    units.push(foldArticle(n));
  }
  return units;
}

function windows(toks: Tok[], firstUnits: Set<string>): Window[] {
  const list: Window[] = [];
  let cur: Tok[] = [];
  let start = -1;
  let joined = false;
  const flush = () => {
    // Names are short; a long unpunctuated run is narrative, of which only
    // the opening words can be a name.
    if (cur.length) {
      const name = cur.slice(0, MAX_NAME_WORDS);
      list.push({ toks: name, units: toUnits(name, firstUnits), joined, start });
    }
    cur = [];
    joined = false;
  };
  toks.forEach((t, i) => {
    if (t.type !== "word") { flush(); return; }
    const waw = t.norm.length > 3 && t.norm.startsWith("و") && firstUnits.has(t.norm.slice(1));
    if (t.boundaryBefore || (cur.length > 0 && waw)) flush();
    if (!cur.length) {
      start = i;
      joined = waw && i > 0 && toks[i - 1].type === "word";
    }
    cur.push(t);
  });
  flush();
  return list;
}

export function alignChain(text: string, chain: string[], idx: NameIndex): Alignment {
  const toks = tokenize(text);
  const wins = windows(toks, idx.firstUnits);
  const k = chain.length;
  const m = wins.length;
  const endOf = (w: Window) => w.start + w.toks.length;
  const span = (w: Window): [number, number] => [w.toks[0].s, w.toks[w.toks.length - 1].e];

  const scoreFor = (w: Window, id: string, student: string | null): number => {
    const units = idx.units(id);
    if (!units) return 0;
    if (w.units.length === 1 && isKin(w.units[0])) {
      if (KIN_FATHER.has(w.units[0]) && student && idx.parents(student).has(id)) return 6;
      return 2.5;
    }
    let s = 0;
    for (const u of new Set(w.units)) if (units.has(u)) s += idx.idf(u);
    return s;
  };
  // A window that opens like a name: a known first name, a kunya, "ابن X",
  // or a kinship word. Clarifications ("وهو ابن زريع", "يعني ...") describe
  // the previous narrator and are not a new person.
  const nameLikeRaw = (w: Window) => {
    const first = w.toks[0]?.norm ?? "";
    if (CLARIFY.has(first)) return false;
    const u0 = w.units[0] ?? "";
    return isKin(u0) || (idx.known(u0) && !TERM_BY_TOKEN[u0] && u0.length > 2) || u0.startsWith("ابو") || first === "ابن";
  };
  const nameLike = (w: Window) => !w.joined && nameLikeRaw(w);
  const termAt = (from: number, to: number): TermKey | null => {
    let t: TermKey | null = null;
    for (let x = from; x < to; x++) if (toks[x].term) t = toks[x].term!;
    return t;
  };

  // Monotonic alignment maximizing the total score.
  const firstProphetTok = toks.findIndex((t) => PROPHET_WORDS.has(t.norm));
  const sc: Float64Array[] = Array.from({ length: m }, (_, i) => {
    const row = new Float64Array(k);
    const weight = firstProphetTok >= 0 && wins[i].start > firstProphetTok ? NARRATIVE_WEIGHT : 1;
    for (let j = 0; j < k; j++) row[j] = weight * scoreFor(wins[i], chain[j], j > 0 ? chain[j - 1] : null);
    return row;
  });
  const dp: Float64Array[] = Array.from({ length: m + 1 }, () => new Float64Array(k + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= k; j++) {
      let best = Math.max(dp[i - 1][j], dp[i][j - 1]);
      const s = sc[i - 1][j - 1];
      if (s >= THRESHOLD) best = Math.max(best, dp[i - 1][j - 1] + s);
      dp[i][j] = best;
    }
  }
  // Backtrack preferring the earliest mention: when a later chain after a
  // switch repeats the same names, the listed chain is the first one.
  const pairs: [number, number][] = [];
  for (let i = m, j = k; i > 0 && j > 0; ) {
    const s = sc[i - 1][j - 1];
    if (dp[i][j] === dp[i - 1][j]) i--;
    else if (s >= THRESHOLD && dp[i][j] === dp[i - 1][j - 1] + s) { pairs.push([i - 1, j - 1]); i--; j--; }
    else j--;
  }
  pairs.reverse();

  // Positional fallback: where the same small number of chain members and
  // unlinked names sit between two aligned narrators (or before the first,
  // or after the last and before the Prophet ﷺ), pair them in order. This
  // covers narrators cited by kunya or nickname ("أبي قلابة", "ابن علية").
  const beforeProphet = (x: number) => !toks.slice(x > 0 ? wins[x - 1].start : 0, wins[x].start + 1).some((t) => PROPHET_WORDS.has(t.norm));
  const fallback: [number, number][] = [];
  const bounds: [number, number, number, number][] = [];
  let pw = -1;
  let pj = -1;
  for (const [wi, j] of pairs) { bounds.push([pw, pj, wi, j]); pw = wi; pj = j; }
  bounds.push([pw, pj, m, k]);
  for (const [w0, j0, w1, j1] of bounds) {
    const missing = j1 - j0 - 1;
    if (missing < 1 || missing > 2) continue;
    const cand: number[] = [];
    for (let x = w0 + 1; x < w1; x++) {
      if (!nameLikeRaw(wins[x])) continue;
      if (w1 === m && !beforeProphet(x)) break;
      cand.push(x);
      if (w1 === m && cand.length === missing) break;
    }
    if (cand.length !== missing) continue;
    cand.forEach((x, i) => fallback.push([x, j0 + 1 + i]));
  }
  if (fallback.length) {
    pairs.push(...fallback);
    pairs.sort((a, b) => a[1] - b[1]);
  }

  const matched = new Array<boolean>(k).fill(false);
  const winOf = new Array<number>(k).fill(-1);
  const termBefore = new Array<TermKey | null>(k).fill(null);
  const segs: HadithSegment[] = [];
  let prevEnd = 0;
  for (const [wi, j] of pairs) {
    matched[j] = true;
    winOf[j] = wi;
    termBefore[j] = termAt(prevEnd, wins[wi].start);
    const [s, e] = span(wins[wi]);
    segs.push({ s, e, id: chain[j], term: termBefore[j] });
    prevEnd = endOf(wins[wi]);
  }

  // Extend a chain that stops short of names that follow in the text.
  const extended: string[] = [];
  if (k > 0 && matched[k - 1]) {
    let cur = chain[k - 1];
    let wi = winOf[k - 1];
    for (let step = 0; step < 3 && !idx.isCompanion(cur); step++) {
      let next = -1;
      for (let x = wi + 1; x < m && x <= wi + 3; x++) {
        if (toks.slice(endOf(wins[x - 1]), wins[x].start + 1).some((t) => PROPHET_WORDS.has(t.norm))) break;
        if (nameLike(wins[x])) { next = x; break; }
      }
      if (next < 0) break;
      let best: string | null = null;
      let bestScore = 0;
      let second = 0;
      for (const c of idx.teachers(cur)) {
        const s = scoreFor(wins[next], c, cur);
        if (s > bestScore) { second = bestScore; bestScore = s; best = c; }
        else if (s > second) second = s;
      }
      if (!best || bestScore < 3 || bestScore - second < 1.5 || chain.includes(best) || extended.includes(best)) break;
      const term = termAt(endOf(wins[wi]), wins[next].start);
      extended.push(best);
      matched.push(true);
      winOf.push(next);
      termBefore.push(term);
      const [s, e] = span(wins[next]);
      segs.push({ s, e, id: best, term });
      pairs.push([next, k + extended.length - 1]);
      cur = best;
      wi = next;
    }
  }
  const total = k + extended.length;

  // Unlinked names between consecutive linked narrators. A name counts only
  // when a transmission word follows it, so "أبو خيثمة، زهير بن حرب" (kunya
  // then name) is one person.
  const matchedWin = new Set(pairs.map(([wi]) => wi));
  const winAtTok = new Map(wins.map((w, i) => [w.start, i]));
  const followedByTerm = (x: number) => {
    for (let t = endOf(wins[x]); t < toks.length; t++) {
      const type = toks[t].type;
      if (type === "term" || type === "switch") return true;
      if (type === "plural") return false;
      if (type === "word") {
        const wi = winAtTok.get(t);
        if (wi !== undefined && (matchedWin.has(wi) || nameLike(wins[wi]))) return false;
      }
    }
    return false;
  };
  const hiddenBefore = new Array<number>(total).fill(0);
  const hiddenNames = new Map<number, string[]>();
  let prevWin = -1;
  let prevWinEnd = 0;
  for (const [wi, j] of pairs) {
    let lastSwitch = -1;
    for (let t = prevWinEnd; t < wins[wi].start; t++) if (toks[t].type === "switch") lastSwitch = t;
    let count = 0;
    for (let x = prevWin + 1; x < wi; x++) {
      if (wins[x].start <= lastSwitch || matchedWin.has(x) || !nameLike(wins[x])) continue;
      if (followedByTerm(x)) {
        count++;
        const [s, e] = span(wins[x]);
        hiddenNames.set(j, [...(hiddenNames.get(j) ?? []), text.slice(s, e)]);
      }
    }
    hiddenBefore[j] = count;
    prevWin = wi;
    prevWinEnd = endOf(wins[wi]);
  }

  // Switches (ح) between matched narrators of the listed chain.
  const switches: number[] = [];
  let switchUncertain = false;
  toks.forEach((t, ti) => {
    if (t.type !== "switch") return;
    let before = -1;
    let after = -1;
    for (let j = 0; j < k; j++) {
      if (!matched[j]) continue;
      if (endOf(wins[winOf[j]]) <= ti) before = j;
      else if (wins[winOf[j]].start > ti && after < 0) after = j;
    }
    if (before < 0 || after < 0) { switchUncertain = true; return; }
    if (after !== before + 1) switchUncertain = true;
    if (!switches.includes(after - 1)) switches.push(after - 1);
  });
  switches.sort((a, b) => a - b);

  const sharedAfterPlural = new Set<number>();
  toks.forEach((t, ti) => {
    if (t.type !== "plural") return;
    for (let j = 0; j < total; j++) if (matched[j] && wins[winOf[j]].start > ti) { sharedAfterPlural.add(j); break; }
  });

  // Narrators cited together: "حدثنا X وY قالا حدثنا Z" or "حدثنا X وY عن Z".
  const groups: [number, number][] = [];
  const termBeforeTok = (ti: number) => {
    for (let x = ti - 1; x >= 0; x--) if (toks[x].type === "term" || toks[x].type === "switch") return x;
    return -1;
  };
  toks.forEach((t, ti) => {
    if (t.type !== "plural") return;
    let j = -1;
    for (let x = 0; x < k; x++) if (matched[x] && wins[winOf[x]].start > ti) { j = x; break; }
    if (j <= 0) return;
    const slotStart = termBeforeTok(ti);
    // The earliest narrator named inside this slot; unnamed chain members
    // between it and the shared teacher belong to the same slot.
    let first = -1;
    for (let x = j - 1; x >= 0; x--) {
      if (!matched[x]) continue;
      if (wins[winOf[x]].start > slotStart) first = x;
      else break;
    }
    if (first >= 0 && j - 1 > first) groups.push([first, j - 1]);
  });
  for (let x = 0; x + 1 < k; x++) {
    if (matched[x] && matched[x + 1] && winOf[x + 1] === winOf[x] + 1 && wins[winOf[x + 1]].joined) groups.push([x, x + 1]);
  }
  groups.sort((a, b) => a[0] - b[0]);
  const coGroups: [number, number][] = [];
  for (const g of groups) {
    const last = coGroups[coGroups.length - 1];
    if (last && g[0] <= last[1]) last[1] = Math.max(last[1], g[1]);
    else coGroups.push([g[0], g[1]]);
  }

  // The Prophet ﷺ, searched for after the last narrator found.
  const lastWin = pairs.length ? Math.max(...pairs.map(([wi]) => wi)) : -1;
  const lastTok = lastWin >= 0 ? endOf(wins[lastWin]) : 0;
  let prophet: [number, number] | null = null;
  let prophetTerm: TermKey | null = null;
  let prophetEndTok = -1;
  for (let ti = lastTok; ti < toks.length; ti++) {
    const n = toks[ti].norm;
    let endTi = -1;
    if ((n === "رسول" || n === "لرسول" || n === "برسول") && toks[ti + 1]?.norm === "الله") endTi = ti + 1;
    else if (n === "النبي" || n === "للنبي" || n === "بالنبي") endTi = ti;
    if (endTi < 0) continue;
    let e = endTi;
    while (toks[e + 1]?.type === "salawat") e++;
    prophet = [toks[ti].s, toks[e].e];
    prophetTerm = termAt(lastTok, ti);
    prophetEndTok = e + 1;
    break;
  }

  let matnStart: number | null = null;
  let from = prophet ? prophetEndTok : lastWin >= 0 ? lastTok : -1;
  if (from >= 0) {
    while (from < toks.length && toks[from].type !== "word") from++;
    if (from < toks.length) matnStart = toks[from].s;
  }

  return { extended, segs, matched, termBefore, hiddenBefore, hiddenNames, switches, switchUncertain, sharedAfterPlural, coGroups, prophet, prophetTerm, matnStart };
}

/** Matn words that mean "the same text as before" (mithlahu, nahwahu...). */
export function isFollowUpText(matn: string): boolean {
  const norm = normalizeArabic(matn);
  const words = norm.split(/\s+/).filter(Boolean);
  return words.length <= 14 && /(مثله|بمثله|نحوه|بنحوه|بمعناه|بهذا الاسناد|بهذا|مثل حديث|نحو حديث|بمثل|معناه)/.test(norm);
}
