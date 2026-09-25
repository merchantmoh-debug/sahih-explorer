import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { COLLECTIONS } from "@/lib/collections";
import type { HadithRecord } from "@/lib/data/types";
import { pick } from "@/lib/l10n";

/** Compact hadith entry for lists: reference, gradings and opening text. */
export function HadithListItem({ h, locale }: { h: Pick<HadithRecord, "c" | "slug" | "ref" | "en" | "ar" | "matnStart" | "grades">; locale: string }) {
  const t = useTranslations("Hadith");
  const matn = h.ar.slice(h.matnStart ?? 0);
  return (
    <Link href={`/${h.c}/${h.slug}`} className="block rounded-xl border bg-card p-4 transition-colors hover:border-gold/50 hover:bg-accent/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-primary">{pick(COLLECTIONS[h.c].name, locale)} {h.ref.std ?? h.slug}</span>
        {h.grades.length > 0 && (
          <span className="text-xs text-muted-foreground" dir="ltr">
            {h.grades.slice(0, 2).map(([g, v]) => `${g}: ${v}`).join(" · ")}
            {h.grades.length > 2 && ` · +${h.grades.length - 2}`}
          </span>
        )}
      </div>
      {locale === "en" && h.en ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{h.en}</p>
      ) : (
        <p className="mt-2 line-clamp-2 font-amiri text-lg leading-loose text-muted-foreground" dir="rtl" lang="ar">{matn}</p>
      )}
      {locale === "en" && !h.en && <p className="mt-1 text-xs text-muted-foreground">{t("noTranslationShort")}</p>}
    </Link>
  );
}
