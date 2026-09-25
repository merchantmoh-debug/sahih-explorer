import type { NarratorLink, NarratorSummary } from "@/lib/data/types";
import { GRADES, type GradeBand } from "@/lib/vocab/grades";
import { displayName } from "@/lib/l10n";

const BAND_FILL: Record<GradeBand, string> = {
  prophet: "fill-band-prophet", top: "fill-band-top", good: "fill-band-good", fair: "fill-band-fair",
  weak: "fill-band-weak", severe: "fill-band-severe", none: "fill-band-none",
};

const W = 900;
const H = 560;
const MAX_SIDE = 12;

function short(s: string, max = 22) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Teachers fanned above the narrator, students below; line width by the
 *  number of chains through each link. */
export function NarratorNetwork({ center, teachers, students, people, locale, title }: { center: NarratorSummary; teachers: NarratorLink[]; students: NarratorLink[]; people: Record<string, NarratorSummary>; locale: string; title: string }) {
  const cx = W / 2;
  const cy = H / 2;
  const place = (list: NarratorLink[], top: boolean) => {
    const shown = list.filter((l) => people[l.id]).slice(0, MAX_SIDE);
    return shown.map((l, i) => {
      const a = shown.length === 1 ? Math.PI / 2 : Math.PI * (0.1 + (0.8 * i) / (shown.length - 1));
      return { l, x: cx - Math.cos(a) * 390, y: top ? cy - Math.sin(a) * 215 : cy + Math.sin(a) * 215 };
    });
  };
  const up = place(teachers, true);
  const down = place(students, false);
  const width = (n: number) => Math.min(1 + Math.log2(1 + n), 6);
  // Labels sit above teachers and below students; where two would collide
  // (near the top and bottom of the fan) the later one moves to the other
  // side of its node or one line further out.
  const centerLabel = short(displayName(center, locale), 30);
  const cw = centerLabel.length * 8.2;
  const boxes = [{ x1: cx - cw / 2, x2: cx + cw / 2, y1: cy + 26, y2: cy + 44 }];
  const labelAt = (x: number, y: number, text: string) => {
    const w = text.length * 6.6;
    const lx = Math.min(Math.max(x, w / 2 + 4), W - w / 2 - 4);
    const tries = y > cy ? [y + 22, y - 13, y + 36] : [y - 14, y + 24, y - 28];
    for (const ty of tries) {
      const box = { x1: lx - w / 2, x2: lx + w / 2, y1: ty - 12, y2: ty + 3 };
      if (!boxes.some((b) => b.x1 < box.x2 && box.x1 < b.x2 && b.y1 < box.y2 && box.y1 < b.y2)) {
        boxes.push(box);
        return { lx, ty };
      }
    }
    return { lx, ty: tries[0] };
  };
  const node = ({ l, x, y }: { l: NarratorLink; x: number; y: number }) => {
    const p = people[l.id];
    const label = short(displayName(p, locale));
    const { lx, ty } = labelAt(x, y, label);
    return (
      <a key={`${l.id}-${y}`} href={`/${locale}/scholar/${l.id}`}>
        <circle cx={x} cy={y} r={7} className={BAND_FILL[GRADES[p.g].band]} />
        <text x={lx} y={ty} textAnchor="middle" className="fill-foreground stroke-background text-[12px] [paint-order:stroke]" strokeWidth={3}>{label}</text>
        <title>{`${p.en} · ${p.ar}${l.n ? ` · ${l.n}` : ""}`}</title>
      </a>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
      <title>{title}</title>
      {[...up, ...down].map(({ l, x, y }) => (
        <line key={`e-${l.id}-${y}`} x1={x} y1={y} x2={cx} y2={cy} className="stroke-foreground" strokeOpacity={0.25} strokeWidth={width(l.n)} />
      ))}
      {up.map(node)}
      {down.map(node)}
      <circle cx={cx} cy={cy} r={16} className="fill-gold" />
      <text x={cx} y={cy + 40} textAnchor="middle" className="fill-foreground stroke-background text-[15px] font-semibold [paint-order:stroke]" strokeWidth={4}>{centerLabel}</text>
    </svg>
  );
}
