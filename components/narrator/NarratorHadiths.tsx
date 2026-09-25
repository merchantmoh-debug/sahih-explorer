"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { COLLECTIONS, type CollectionSlug } from "@/lib/collections";
import { formatNumber, pick } from "@/lib/l10n";

export interface HadithSummary {
  key: string;
  collection: CollectionSlug;
  number: string;
  reference: string | null;
  textEn: string | null;
  textAr: string;
  grades: { grader: string; grade: string }[];
}

interface Props {
  narratorId: string;
  total: number;
  byCollection: Partial<Record<CollectionSlug, number>>;
  initial: HadithSummary[];
}

/** Paginated list of the hadith a narrator appears in, loaded from the API
 *  ten at a time instead of shipping every text with the page. */
export function NarratorHadiths({ narratorId, total, byCollection, initial }: Props) {
  const t = useTranslations("Narrator");
  const locale = useLocale();
  const [collection, setCollection] = useState<CollectionSlug | "">("");
  const [page, setPage] = useState(1);
  const [fetched, setFetched] = useState<{ key: string; collection: CollectionSlug | ""; items: HadithSummary[]; total: number } | null>(null);
  const key = `${collection}|${page}`;
  const needsFetch = collection !== "" || page > 1;

  useEffect(() => {
    if (!needsFetch) return;
    const ctrl = new AbortController();
    fetch(`/api/v1/narrators/${narratorId}/hadiths?page=${page}&collection=${collection}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: { total: number; hadiths: HadithSummary[] }) => {
        setFetched((prev) => {
          const before = page === 1 ? [] : prev && prev.collection === collection ? prev.items : collection === "" ? initial : [];
          return { key, collection, items: [...before, ...data.hadiths], total: data.total };
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [key, needsFetch, collection, page, narratorId, initial]);

  const current = fetched && fetched.collection === collection ? fetched : null;
  const items = !needsFetch ? initial : current?.items ?? [];
  const count = collection === "" ? total : current?.total ?? byCollection[collection] ?? 0;
  const loading = needsFetch && current?.key !== key;

  const choose = (c: CollectionSlug | "") => { setCollection(c); setPage(1); };
  const entries = Object.entries(byCollection) as [CollectionSlug, number][];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterByCollection")}>
        <Button size="sm" variant={collection === "" ? "default" : "outline"} onClick={() => choose("")}>{t("allCollections", { count: formatNumber(total, locale) })}</Button>
        {entries.map(([c, n]) => (
          <Button key={c} size="sm" variant={collection === c ? "default" : "outline"} onClick={() => choose(c)}>
            {pick(COLLECTIONS[c].name, locale)} ({formatNumber(n, locale)})
          </Button>
        ))}
      </div>
      <ul className="space-y-3">
        {items.map((h) => (
          <li key={h.key}>
            <Link href={`/${h.collection}/${h.number}`} className="block rounded-xl border bg-card p-4 transition-colors hover:border-gold/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-primary">{pick(COLLECTIONS[h.collection].name, locale)} {h.number}</span>
                {h.grades.length > 0 && <span className="text-xs text-muted-foreground" dir="ltr">{h.grades.slice(0, 2).map((g) => `${g.grader}: ${g.grade}`).join(" · ")}</span>}
              </div>
              {locale === "en" && h.textEn ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{h.textEn}</p>
              ) : (
                <p className="mt-2 line-clamp-2 font-amiri text-lg text-muted-foreground" dir="rtl" lang="ar">{h.textAr}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t("loading")}</p>}
      {!loading && items.length < count && (
        <Button variant="outline" onClick={() => setPage((p) => p + 1)}>{t("loadMore", { shown: formatNumber(items.length, locale), total: formatNumber(count, locale) })}</Button>
      )}
    </div>
  );
}
