// Layered layout for transmission graphs: the source (the Prophet ﷺ) at the
// top, compilers at the bottom, parallel chains side by side. A small
// Sugiyama-style layout: longest-path layers, barycentre ordering.

export interface GraphEdgeInput {
  from: string;
  to: string;
  gap?: boolean;
  term?: string | null;
  /** Number of chains using this link (merged graphs). */
  weight?: number;
}

export interface PlacedNode { id: string; layer: number; x: number; y: number }
export interface PlacedEdge extends GraphEdgeInput { path: string; mid: [number, number] }
export interface GraphLayout { nodes: PlacedNode[]; edges: PlacedEdge[]; width: number; height: number; nodeW: number; nodeH: number }

export interface LayoutOptions { nodeW?: number; nodeH?: number; gapX?: number; gapY?: number; pad?: number; mirror?: boolean }

export function layoutGraph(nodeIds: string[], edgesIn: GraphEdgeInput[], opts: LayoutOptions = {}): GraphLayout {
  const nodeW = opts.nodeW ?? 188;
  const nodeH = opts.nodeH ?? 54;
  const gapX = opts.gapX ?? 18;
  const gapY = opts.gapY ?? 40;
  const pad = opts.pad ?? 12;

  const ids = [...new Set([...nodeIds, ...edgesIn.flatMap((e) => [e.from, e.to])])];
  const edges = edgesIn.filter((e) => e.from !== e.to);
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  const inc = new Map<string, string[]>(ids.map((id) => [id, []]));

  // Drop edges that would close a cycle (possible with inconsistent data).
  const state = new Map<string, number>();
  const accepted: GraphEdgeInput[] = [];
  const tentative = new Map<string, GraphEdgeInput[]>(ids.map((id) => [id, []]));
  for (const e of edges) tentative.get(e.from)!.push(e);
  const visit = (id: string) => {
    state.set(id, 1);
    for (const e of tentative.get(id)!) {
      const s = state.get(e.to) ?? 0;
      if (s === 1) continue;
      accepted.push(e);
      if (s === 0) visit(e.to);
    }
    state.set(id, 2);
  };
  const roots = ids.filter((id) => !edges.some((e) => e.to === id));
  for (const id of [...roots, ...ids]) if (!state.has(id)) visit(id);
  for (const e of accepted) {
    out.get(e.from)!.push(e.to);
    inc.get(e.to)!.push(e.from);
  }

  // Longest-path layering.
  const layer = new Map<string, number>();
  const indeg = new Map(ids.map((id) => [id, inc.get(id)!.length]));
  const queue = ids.filter((id) => indeg.get(id) === 0);
  for (const id of queue) layer.set(id, 0);
  while (queue.length) {
    const id = queue.shift()!;
    for (const to of out.get(id)!) {
      layer.set(to, Math.max(layer.get(to) ?? 0, layer.get(id)! + 1));
      indeg.set(to, indeg.get(to)! - 1);
      if (indeg.get(to) === 0) queue.push(to);
    }
  }
  // Sinks (compilers) all sit on the last layer.
  const maxLayer = Math.max(0, ...layer.values());
  for (const id of ids) if (!out.get(id)!.length && inc.get(id)!.length) layer.set(id, maxLayer);

  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  const seen = new Set<string>();
  const dfs = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    layers[layer.get(id)!].push(id);
    for (const to of out.get(id)!) dfs(to);
  };
  for (const id of roots) dfs(id);
  for (const id of ids) dfs(id);

  // Barycentre sweeps to reduce crossings.
  const pos = new Map<string, number>();
  const index = () => layers.forEach((l) => l.forEach((id, i) => pos.set(id, i)));
  index();
  for (let iter = 0; iter < 6; iter++) {
    const down = iter % 2 === 0;
    const order = down ? layers.map((_, i) => i) : layers.map((_, i) => layers.length - 1 - i);
    for (const li of order) {
      const bary = (id: string) => {
        const nb = down ? inc.get(id)! : out.get(id)!;
        return nb.length ? nb.reduce((s, x) => s + pos.get(x)!, 0) / nb.length : pos.get(id)!;
      };
      layers[li].sort((a, b) => bary(a) - bary(b));
      layers[li].forEach((id, i) => pos.set(id, i));
    }
  }

  const widest = Math.max(1, ...layers.map((l) => l.length));
  const width = pad * 2 + widest * nodeW + (widest - 1) * gapX;
  const height = pad * 2 + layers.length * nodeH + (layers.length - 1) * gapY;
  const placed = new Map<string, PlacedNode>();
  layers.forEach((l, li) => {
    const rowW = l.length * nodeW + (l.length - 1) * gapX;
    const x0 = (width - rowW) / 2;
    l.forEach((id, i) => {
      let x = x0 + i * (nodeW + gapX);
      if (opts.mirror) x = width - x - nodeW;
      placed.set(id, { id, layer: li, x, y: pad + li * (nodeH + gapY) });
    });
  });

  const placedEdges: PlacedEdge[] = accepted.map((e) => {
    const a = placed.get(e.from)!;
    const b = placed.get(e.to)!;
    const x1 = a.x + nodeW / 2;
    const y1 = a.y + nodeH;
    const x2 = b.x + nodeW / 2;
    const y2 = b.y;
    const dy = (y2 - y1) / 2;
    return { ...e, path: `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`, mid: [(x1 + x2) / 2, (y1 + y2) / 2] };
  });

  return { nodes: [...placed.values()], edges: placedEdges, width, height, nodeW, nodeH };
}
