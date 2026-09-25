/**
 * Turns a flat chain plus its text alignment into a transmission graph:
 * teacher → student edges from the Prophet ﷺ (when the text reaches him)
 * down to the compiler.
 *
 * Two constructions in the text are not a straight line:
 *  - narrators cited together ("X and Y said: Z narrated to us") are parallel
 *    students of the same teacher, so they form one slot;
 *  - a switch (ح) starts a new chain; each earlier branch is joined to the
 *    later one at the narrator its last member heard from.
 */
import type { ChainGraph } from "../../../lib/data/types";
import type { TermKey } from "../../../lib/vocab/terms";
import type { Alignment } from "./align";

export const PROPHET_ID = "1";

export interface GraphInput {
  chain: string[];
  compilerId: string;
  alignment: Alignment | null;
  marfu: boolean;
  /** Whether teacher → student is attested outside this chain. */
  attested: (teacher: string, student: string) => boolean;
  isCompanion: (id: string) => boolean;
}

export function buildGraph({ chain, compilerId, alignment, marfu, attested, isCompanion }: GraphInput): ChainGraph {
  const edges = new Map<string, [string, string, TermKey | null]>();
  const gaps = new Map<string, [string, string]>();
  const addGap = (from: string, to: string) => { if (from !== to) gaps.set(`${from}>${to}`, [from, to]); };
  const matchedAt = (j: number) => alignment?.matched[j] ?? false;
  // The text names someone between these two whom the dataset does not link.
  const hiddenAt = (j: number) => matchedAt(j) && (alignment?.hiddenBefore[j] ?? 0) > 0;
  const add = (from: string, to: string, term: TermKey | null) => {
    if (from === to) return;
    const key = `${from}>${to}`;
    const prev = edges.get(key);
    if (!prev || (!prev[2] && term)) edges.set(key, [from, to, term]);
  };
  const term = (j: number) => alignment?.termBefore[j] ?? null;

  if (!chain.length) {
    return { nodes: marfu ? [PROPHET_ID, compilerId] : [], edges: [], gaps: [], branched: false, uncertain: false };
  }

  // Slots: single narrators or groups cited together.
  const coGroups = alignment?.coGroups ?? [];
  const slots: number[][] = [];
  for (let j = 0; j < chain.length; ) {
    const g = coGroups.find(([a]) => a === j);
    if (g) {
      slots.push(Array.from({ length: g[1] - g[0] + 1 }, (_, x) => g[0] + x));
      j = g[1] + 1;
    } else {
      slots.push([j]);
      j++;
    }
  }

  // Branches: runs of slots between switches (ح).
  const switches = new Set(alignment?.switches ?? []);
  const branches: number[][][] = [];
  let cur: number[][] = [];
  for (const slot of slots) {
    cur.push(slot);
    if (switches.has(slot[slot.length - 1])) { branches.push(cur); cur = []; }
  }
  if (cur.length) branches.push(cur);
  const branched = branches.length > 1;
  let uncertain = Boolean(alignment?.switchUncertain);

  for (const b of branches) {
    const lead = b[0][0];
    for (const s of b[0]) {
      if (hiddenAt(lead)) addGap(chain[s], compilerId);
      else add(chain[s], compilerId, term(lead));
    }
    for (let x = 0; x + 1 < b.length; x++) {
      const teacherLead = b[x + 1][0];
      const gap = hiddenAt(teacherLead) && matchedAt(b[x][b[x].length - 1]);
      for (const t of b[x + 1]) for (const s of b[x]) {
        if (gap) addGap(chain[t], chain[s]);
        else add(chain[t], chain[s], term(teacherLead));
      }
    }
  }

  // Join each earlier branch to its teacher in a later branch.
  for (let bi = 0; bi + 1 < branches.length; bi++) {
    const b = branches[bi];
    const endSlot = b[b.length - 1];
    const later = branches.slice(bi + 1).flat().flat();
    const ends = endSlot.map((j) => chain[j]);
    // The same narrator continues in the later chain: nothing to join.
    if (ends.some((e) => later.some((j) => chain[j] === e))) continue;
    let target = later.find((j) => ends.some((e) => attested(chain[j], e)));
    if (target === undefined && alignment) {
      target = later.find((j) => alignment.sharedAfterPlural.has(j));
      if (target !== undefined) uncertain = true;
    }
    if (target === undefined) {
      const next = branches[bi + 1].flat();
      target = next[Math.min(b.length, next.length - 1)];
      uncertain = true;
    }
    for (const e of ends) add(chain[target], e, term(target));
  }

  const lastBranch = branches[branches.length - 1];
  const sources = lastBranch[lastBranch.length - 1].map((j) => chain[j]);
  if (marfu) {
    for (const s of sources) {
      if (s === PROPHET_ID) continue;
      // Only Companions heard the Prophet ﷺ; anyone else reaching him is
      // either mursal or a chain the dataset lists only in part.
      if (isCompanion(s)) add(PROPHET_ID, s, alignment?.prophetTerm ?? null);
      else addGap(PROPHET_ID, s);
    }
  }

  const nodes: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => { if (!seen.has(id)) { seen.add(id); nodes.push(id); } };
  if (marfu) push(PROPHET_ID);
  for (let j = chain.length - 1; j >= 0; j--) push(chain[j]);
  push(compilerId);

  for (const k of edges.keys()) gaps.delete(k);
  return { nodes, edges: [...edges.values()], gaps: [...gaps.values()], branched, uncertain: branched && uncertain };
}
