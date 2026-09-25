import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { COLLECTIONS, COLLECTION_SLUGS, isSahihayn } from "@/lib/collections";
import { getCollection, getNarratorSummary, isCollectionSlug } from "@/lib/data/server";
import { formatNumber, formatPlain, isRtl, pick } from "@/lib/l10n";
import { NarratorName } from "@/components/narrator/NarratorName";
import { pageAlternates } from "@/lib/site";

interface Props { params: Promise<{ locale: string; collection: string }> }

export function generateStaticParams() {
  return COLLECTION_SLUGS.map((collection) => ({ collection }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, collection } = await params;
  if (!isCollectionSlug(collection)) return {};
  const t = await getTranslations({ locale, namespace: "Collections" });
  const name = pick(COLLECTIONS[collection].name, locale);
  return { title: name, description: t("collectionDescription", { name }), alternates: pageAlternates(locale, `/${collection}`) };
}

export default async function CollectionPage({ params }: Props) {
  const { locale, collection } = await params;
  setRequestLocale(locale);
  if (!isCollectionSlug(collection)) notFound();
  const t = await getTranslations("Collections");
  const c = getCollection(collection)!;
  const info = COLLECTIONS[collection];
  const compiler = getNarratorSummary(info.compilerId);
  const rtl = isRtl(locale);
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <Link href="/collections" className="text-sm text-muted-foreground hover:text-foreground">{t("title")}</Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{pick(info.name, locale)}</h1>
        <p className="font-amiri text-2xl text-muted-foreground" lang="ar">{info.name.ar}</p>
        {compiler && (
          <p className="text-muted-foreground">
            {t("compiler")}: <Link href={`/scholar/${compiler.id}`} className="font-medium text-foreground underline-offset-4 hover:underline"><NarratorName n={compiler} locale={locale} /></Link>
            {compiler.d !== null && ` · ${t("died", { year: formatPlain(compiler.d, locale) })}`}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {isSahihayn(collection)
            ? t("summarySahih", { hadiths: formatNumber(c.count, locale), books: formatNumber(c.books.length, locale), english: formatNumber(c.translated, locale) })
            : t("summary", { hadiths: formatNumber(c.count, locale), books: formatNumber(c.books.length, locale), graded: formatNumber(c.graded, locale), english: formatNumber(c.translated, locale) })}
        </p>
      </header>
      <ol className="divide-y rounded-2xl border bg-card">
        {c.books.map((b) => (
          <li key={b.n}>
            <Link href={`/${collection}/book/${b.n}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/50">
              <span className="w-10 shrink-0 text-center font-mono text-sm text-muted-foreground">{formatPlain(b.n, locale)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{rtl ? b.ar || b.en : b.en}</span>
                <span className="block truncate font-amiri text-muted-foreground" lang="ar" dir="rtl">{rtl ? b.en : b.ar}</span>
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">{t("count", { count: b.count })}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
