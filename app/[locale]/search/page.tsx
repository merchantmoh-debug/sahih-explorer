import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Search } from "lucide-react";
import { COLLECTIONS, COLLECTION_SLUGS } from "@/lib/collections";
import { getHadiths, isCollectionSlug } from "@/lib/data/server";
import { searchHadiths, searchNarrators } from "@/lib/data/search";
import { pick } from "@/lib/l10n";
import { Section } from "@/components/site/Section";
import { Pager } from "@/components/site/Pager";
import { NarratorRow } from "@/components/narrator/NarratorRow";
import { HadithListItem } from "@/components/hadith/HadithListItem";

const PAGE_SIZE = 20;

interface Props { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; collection?: string; page?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });
  return { title: t("title"), robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Search");
  const q = (sp.q ?? "").trim().slice(0, 200);
  const collection = sp.collection && isCollectionSlug(sp.collection) ? sp.collection : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const hadiths = q ? searchHadiths(q, { collection, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }) : null;
  // An exact reference ("bukhari 1") goes straight to the hadith.
  if (hadiths?.reference && page === 1 && !collection) redirect(`/${locale}/${hadiths.reference}`);
  const narrators = q && page === 1 ? searchNarrators(q, 12) : [];
  const records = hadiths ? getHadiths(hadiths.hits.map((h) => h.key)) : [];
  const pages = hadiths ? Math.max(1, Math.ceil(hadiths.total / PAGE_SIZE)) : 1;
  const qs = (p: number) => `/search?${new URLSearchParams({ q, ...(collection ? { collection } : {}), page: String(p) }).toString()}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <form action={`/${locale}/search`} className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">{t("placeholder")}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input name="q" defaultValue={q} placeholder={t("placeholder")} dir="auto" className="h-11 w-full rounded-lg border bg-background ps-9 pe-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <select name="collection" defaultValue={collection ?? ""} className="h-11 rounded-lg border bg-background px-3" aria-label={t("collection")}>
            <option value="">{t("allCollections")}</option>
            {COLLECTION_SLUGS.map((c) => <option key={c} value={c}>{pick(COLLECTIONS[c].name, locale)}</option>)}
          </select>
          <button type="submit" className="h-11 rounded-lg bg-primary px-5 font-medium text-primary-foreground hover:opacity-90">{t("submit")}</button>
        </form>
        <p className="text-sm text-muted-foreground">{t("tips")}</p>
      </header>

      {q && (
        <>
          {narrators.length > 0 && (
            <Section title={t("narrators")}>
              <ul className="grid gap-1 rounded-xl border p-2 sm:grid-cols-2">
                {narrators.map((n) => <li key={n.id}><NarratorRow n={n} locale={locale} extra={t("records", { count: n.n })} /></li>)}
              </ul>
            </Section>
          )}
          <Section title={t("hadiths", { count: hadiths?.total ?? 0 })}>
            {records.length ? (
              <ul className="space-y-3">{records.map((h) => <li key={h.key}><HadithListItem h={h} locale={locale} /></li>)}</ul>
            ) : (
              <p className="text-muted-foreground">{t("noResults")}</p>
            )}
            <Pager page={page} pages={pages} hrefFor={qs} />
          </Section>
        </>
      )}
    </div>
  );
}
