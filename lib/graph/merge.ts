// Combines the chains of several hadith records into one graph and finds
// where they meet.
import type { HadithRecord } from "../data/types";
import type { GraphEdgeInput } from "./layout";

export interface MergedGraph {
  nodes: string[];
  edges: GraphEdgeInput[];
  /** Narrators (not the Prophet ﷺ or compilers) passed through by ≥ 2 records, most first. */
  meetingPoints: { id: string; count: number }[];
  /** Distinct first narrators after the Prophet ﷺ (usually Companions). */
  sources: string[];
}

export function edgesOf(h: HadithRecord): GraphEdgeInput[] {
  return [
    ...h.graph.edges.map(([from, to, term]) => ({ from, to, term })),
    ...h.graph.gaps.map(([from, to]) => ({ from, to, gap: true })),
  ];
}

export function mergeChains(records: HadithRecord[], compilers: Set<string>, prophetId = "1"): MergedGraph {
  const nodes: string[] = [];
  const seen = new Set<string>();
  const edges = new Map<string, GraphEdgeInput>();
  const through = new Map<string, number>();
  for (const h of records) {
    for (const id of h.graph.nodes) {
      if (!seen.has(id)) { seen.add(id); nodes.push(id); }
      if (id !== prophetId && !compilers.has(id)) through.set(id, (through.get(id) ?? 0) + 1);
    }
    for (const e of edgesOf(h)) {
      const k = `${e.from}>${e.to}`;
      const prev = edges.get(k);
      if (prev) prev.weight = (prev.weight ?? 1) + 1;
      else edges.set(k, { ...e, weight: 1 });
    }
  }
  const sources = [...new Set([...edges.values()].filter((e) => e.from === prophetId).map((e) => e.to))];
  const meetingPoints = [...through.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
  return { nodes, edges: [...edges.values()], meetingPoints, sources };
}
