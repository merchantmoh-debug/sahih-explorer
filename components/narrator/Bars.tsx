import { formatNumber } from "@/lib/l10n";

/** Horizontal bars for small counts (no chart library needed). */
export function Bars({ rows, total, locale }: { rows: { label: React.ReactNode; value: number; hint?: string }[]; total?: number; locale: string }) {
  const max = total ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm" title={r.hint}>
          <span className="truncate text-muted-foreground">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-gold" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </span>
          <span className="tabular-nums">{formatNumber(r.value, locale)}</span>
        </li>
      ))}
    </ul>
  );
}
