import type { NarratorSummary } from "@/lib/data/types";
import { displayName, HONORIFIC_TEXT } from "@/lib/l10n";
import { cn } from "@/lib/utils";

/** A narrator's name in the reader's script, with the honorific after it. */
export function NarratorName({ n, locale, className, honorific = true }: { n: Pick<NarratorSummary, "en" | "ar" | "h">; locale: string; className?: string; honorific?: boolean }) {
  return (
    <span className={className}>
      <span>{displayName(n, locale)}</span>
      {honorific && n.h && (
        <span lang="ar" className={cn("ms-1 font-amiri text-gold", n.h === "saw" ? "" : "text-[0.8em]")}>{HONORIFIC_TEXT[n.h]}</span>
      )}
    </span>
  );
}
