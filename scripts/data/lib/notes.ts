/**
 * Automatic observations about a chain, for study. They restate what the
 * dataset records (grades, generations, death years, where a link is seen);
 * they are not a grading of the hadith.
 */
import type { ChainGraph, ChainNote, NarratorSummary } from "../../../lib/data/types";
import { GRADES, isNoteworthyBand } from "../../../lib/vocab/grades";
import { PROPHET_ID } from "./graph";

export interface NotesInput {
  graph: ChainGraph;
  chain: string[];
  compilerId: string;
  marfu: boolean;
  followUp: boolean;
  narrator: (id: string) => NarratorSummary | undefined;
  /** Hadith records in which teacher → student occurs, and whether listed. */
  edgeInfo: (teacher: string, student: string) => { n: number; listed: boolean };
  /** Names in the text that match a different narrator than the one linked. */
  nameDiffers: { id: string; alt: string; text: string }[];
  /** Narrators added from the text beyond the source's chain. */
  inferred: string[];
  /** Unlinked names in the text just before this teacher. */
  hiddenNames: (teacher: string) => string[];
}

// Calibrated on the whole dataset: generation gaps of 3–4 between teacher and
// student are routine (long-lived students), so only far larger ones, or
// death years that are hard to reconcile, are called out.
const GEN_GAP = 6;
const GEN_ORDER = -4;
const DEATH_GAP = 120;
const DEATH_ORDER = -80;

export function chainNotes(input: NotesInput): ChainNote[] {
  const { graph, chain, compilerId, marfu, followUp, narrator, edgeInfo, nameDiffers } = input;
  const notes: ChainNote[] = [];
  if (!chain.length) {
    notes.push({ kind: "no-chain", ids: [] });
    return notes;
  }
  if (followUp) notes.push({ kind: "follow-up", ids: [] });
  if (input.inferred.length) notes.push({ kind: "inferred", ids: input.inferred });

  const seen = new Set<string>();
  for (const id of chain) {
    if (seen.has(id)) continue;
    seen.add(id);
    const n = narrator(id);
    if (!n) { notes.push({ kind: "unidentified", ids: [id] }); continue; }
    if (n.cls === "prophet") continue;
    const band = GRADES[n.g].band;
    if (n.g === "none") notes.push({ kind: "no-grade", ids: [id] });
    else if (isNoteworthyBand(band)) notes.push({ kind: "grade", ids: [id], data: { grade: n.g } });
  }

  for (const [from, to] of graph.edges) {
    if (from === PROPHET_ID || to === compilerId) continue;
    const t = narrator(from);
    const s = narrator(to);
    if (!t || !s) continue;
    if (t.gen !== null && s.gen !== null) {
      const gap = s.gen - t.gen;
      if (gap >= GEN_GAP) notes.push({ kind: "gen-gap", ids: [from, to], data: { teacherGen: t.gen, studentGen: s.gen } });
      else if (gap <= GEN_ORDER) notes.push({ kind: "gen-order", ids: [from, to], data: { teacherGen: t.gen, studentGen: s.gen } });
    }
    if (t.d !== null && s.d !== null) {
      const diff = s.d - t.d;
      if (diff >= DEATH_GAP) notes.push({ kind: "death-gap", ids: [from, to], data: { teacherDeath: t.d, studentDeath: s.d } });
      else if (diff <= DEATH_ORDER) notes.push({ kind: "death-order", ids: [from, to], data: { teacherDeath: t.d, studentDeath: s.d } });
    }
    const info = edgeInfo(from, to);
    if (info.n <= 1 && !info.listed) notes.push({ kind: "unattested", ids: [from, to] });
  }

  for (const [from, to] of graph.gaps) {
    if (from === PROPHET_ID) notes.push({ kind: "source-not-companion", ids: [to] });
    else notes.push({ kind: "hidden-narrators", ids: [from, to], data: { names: input.hiddenNames(from).join("، ") } });
  }
  for (const d of nameDiffers) notes.push({ kind: "name-differs", ids: [d.id, d.alt], data: { text: d.text } });
  if (graph.branched) notes.push({ kind: graph.uncertain ? "uncertain-branch" : "branched", ids: [] });
  if (!marfu) notes.push({ kind: "not-marfu", ids: [chain[chain.length - 1]] });
  return notes;
}
