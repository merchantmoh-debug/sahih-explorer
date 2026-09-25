import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { NarratorSummary } from "@/lib/data/types";
import { GRADES } from "@/lib/vocab/grades";
import { formatPlain, pick, secondaryName } from "@/lib/l10n";
import { cn } from "@/lib/utils";
import { BAND_DOT } from "./GradeBadge";
import { NarratorName } from "./NarratorName";

/** One narrator as a link row: name, grade, death year and optional extra. */
export function NarratorRow({ n, locale, extra, className }: { n: NarratorSummary; locale: string; extra?: React.ReactNode; className?: string }) {
  const t = useTranslations("Narrator");
  const g = GRADES[n.g];
  const second = secondaryName(n, locale);
  const inner = (
    <>
      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", BAND_DOT[g.band])} aria-hidden />
      <span className="min-w-0 flex-1">
        <NarratorName n={n} locale={locale} className="block truncate font-medium" />
        {second && <span className="block truncate text-xs text-muted-foreground" dir="auto">{second}</span>}
        <span className="block text-xs text-muted-foreground">
          {pick(g.label, locale)}
          {n.d !== null && n.cls !== "prophet" && ` · ${t("diedShort", { year: formatPlain(n.d, locale) })}`}
          {n.gen !== null && ` · ${t("generationShort", { n: formatPlain(n.gen, locale) })}`}
        </span>
      </span>
      {extra && <span className="shrink-0 text-xs text-muted-foreground">{extra}</span>}
    </>
  );
  const cls = cn("flex items-start gap-3 rounded-lg px-3 py-2 text-start", className);
  return n.cls === "prophet" ? <div className={cls}>{inner}</div> : <Link href={`/scholar/${n.id}`} className={cn(cls, "transition-colors hover:bg-accent")}>{inner}</Link>;
}
