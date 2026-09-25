import { layoutGraph, type GraphEdgeInput } from "@/lib/graph/layout";
import type { NarratorSummary } from "@/lib/data/types";
import { GRADES, type GradeBand } from "@/lib/vocab/grades";
import { TERMS, type TermKey } from "@/lib/vocab/terms";
import { displayName, isRtl, pick } from "@/lib/l10n";

const BAND_FILL: Record<GradeBand, string> = {
  prophet: "fill-band-prophet",
  top: "fill-band-top",
  good: "fill-band-good",
  fair: "fill-band-fair",
  weak: "fill-band-weak",
  severe: "fill-band-severe",
  none: "fill-band-none",
};

export interface GraphLabels {
  died: (year: number) => string;
  generation: (n: number) => string;
  compiler: string;
  unidentified: string;
  gap: string;
}

interface Props {
  svgId: string;
  title: string;
  nodes: string[];
  edges: GraphEdgeInput[];
  people: Record<string, NarratorSummary>;
  locale: string;
  compilers: Set<string>;
  labels: GraphLabels;
  /** Nodes to emphasise; others are drawn muted. */
  highlight?: Set<string>;
  showTerms?: boolean;
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function TransmissionGraph({ svgId, title, nodes, edges, people, locale, compilers, labels, highlight, showTerms = true }: Props) {
  const rtl = isRtl(locale);
  const layout = layoutGraph(nodes, edges, { mirror: rtl });
  const { nodeW, nodeH } = layout;
  // text-anchor follows the text direction ("start" is the right edge in
  // RTL), so the direction is set on the SVG itself: the page's direction
  // does not travel with an exported file.
  const textX = rtl ? nodeW - 14 : 14;

  return (
    <svg
      id={svgId}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width}
      height={layout.height}
      role="img"
      aria-label={title}
      direction={rtl ? "rtl" : "ltr"}
      className="mx-auto block max-w-none select-none"
    >
      <title>{title}</title>
      <defs>
        <marker id={`${svgId}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
        </marker>
      </defs>
      <g>
        {layout.edges.map((e) => {
          const dim = highlight && !(highlight.has(e.from) && highlight.has(e.to));
          return (
            <path
              key={`${e.from}>${e.to}`}
              d={e.path}
              fill="none"
              className={e.gap ? "stroke-muted-foreground" : "stroke-foreground"}
              strokeOpacity={dim ? 0.18 : e.gap ? 0.8 : 0.45}
              strokeWidth={Math.min(1.25 + (e.weight ?? 1) * 0.6, 5)}
              strokeDasharray={e.gap ? "5 5" : undefined}
              markerEnd={`url(#${svgId}-arrow)`}
            >
              <title>{e.gap ? labels.gap : e.term ? `${TERMS[e.term as TermKey].ar} · ${pick(TERMS[e.term as TermKey].label, locale)}` : ""}</title>
            </path>
          );
        })}
        {showTerms &&
          layout.edges.map((e) =>
            e.gap ? (
              <text key={`g-${e.from}>${e.to}`} x={e.mid[0]} y={e.mid[1] + 4} textAnchor="middle" className="fill-muted-foreground text-[13px] font-semibold">?</text>
            ) : e.term ? (
              <g key={`t-${e.from}>${e.to}`} transform={`translate(${e.mid[0]},${e.mid[1]})`} opacity={highlight && !(highlight.has(e.from) && highlight.has(e.to)) ? 0.3 : 1}>
                <rect x={-24} y={-10} width={48} height={20} rx={10} className="fill-background stroke-border" />
                <text y={5} textAnchor="middle" className="fill-muted-foreground font-amiri text-[13px]">{TERMS[e.term as TermKey].ar}</text>
              </g>
            ) : null,
          )}
      </g>
      <g>
        {layout.nodes.map((n) => {
          const p = people[n.id];
          const compiler = compilers.has(n.id);
          const band: GradeBand = p ? GRADES[p.g].band : "none";
          const name = p ? displayName(p, locale) : labels.unidentified;
          const meta = [
            compiler ? labels.compiler : null,
            p?.d !== null && p?.d !== undefined && p.cls !== "prophet" ? labels.died(p.d) : null,
            p?.gen ? labels.generation(p.gen) : null,
          ].filter(Boolean).join(" · ");
          const dim = highlight && !highlight.has(n.id);
          const body = (
            <g transform={`translate(${n.x},${n.y})`} opacity={dim ? 0.45 : 1}>
              <rect width={nodeW} height={nodeH} rx={12} className={p?.cls === "prophet" ? "fill-gold-soft stroke-gold" : "fill-card stroke-border"} strokeWidth={compiler || p?.cls === "prophet" ? 2 : 1} />
              <rect x={rtl ? nodeW - 6 : 0} width={6} height={nodeH} rx={3} className={BAND_FILL[band]} />
              <text x={textX} y={22} textAnchor="start" className="fill-foreground text-[13px] font-semibold">
                {truncate(name, rtl ? 28 : 23)}
                {p?.h === "saw" ? " ﷺ" : ""}
              </text>
              <text x={textX} y={41} textAnchor="start" className="fill-muted-foreground text-[11px]">
                {truncate(meta || (p ? pick(GRADES[p.g].label, locale) : ""), 34)}
              </text>
              <title>{p ? `${p.en} · ${p.ar} · ${pick(GRADES[p.g].label, locale)}` : n.id}</title>
            </g>
          );
          return p && p.cls !== "prophet" ? (
            <a key={n.id} href={`/${locale}/scholar/${n.id}`} aria-label={name}>{body}</a>
          ) : (
            <g key={n.id}>{body}</g>
          );
        })}
      </g>
    </svg>
  );
}
