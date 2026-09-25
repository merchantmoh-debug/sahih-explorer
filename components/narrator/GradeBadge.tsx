import { Link } from "@/i18n/routing";
import { GRADES, type GradeBand, type GradeKey } from "@/lib/vocab/grades";
import { pick } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export const BAND_DOT: Record<GradeBand, string> = {
  prophet: "bg-band-prophet",
  top: "bg-band-top",
  good: "bg-band-good",
  fair: "bg-band-fair",
  weak: "bg-band-weak",
  severe: "bg-band-severe",
  none: "bg-band-none",
};

export function GradeBadge({ grade, locale, link = true, className }: { grade: GradeKey; locale: string; link?: boolean; className?: string }) {
  const g = GRADES[grade];
  const body = (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", className)} title={pick(g.description, locale)}>
      <span className={cn("size-2 rounded-full", BAND_DOT[g.band])} aria-hidden />
      {pick(g.label, locale)}
    </span>
  );
  return link && grade !== "prophet" ? <Link href={`/glossary#grade-${grade}`} className="hover:opacity-80">{body}</Link> : body;
}
