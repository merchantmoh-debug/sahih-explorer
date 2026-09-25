import { useTranslations } from "next-intl";
import { BAND_DOT } from "@/components/narrator/GradeBadge";
import type { GradeBand } from "@/lib/vocab/grades";

const BANDS: GradeBand[] = ["top", "good", "fair", "weak", "severe", "none"];

export function GraphLegend() {
  const t = useTranslations("Graph");
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {BANDS.map((b) => (
        <li key={b} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${BAND_DOT[b]}`} aria-hidden />
          {t(`band.${b}`)}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <svg width="26" height="8" aria-hidden><line x1="0" y1="4" x2="26" y2="4" className="stroke-muted-foreground" strokeWidth="2" strokeDasharray="5 4" /></svg>
        {t("gapLegend")}
      </li>
    </ul>
  );
}
