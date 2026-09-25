import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { COLLECTIONS } from "@/lib/collections";
import { getBook, isCollectionSlug } from "@/lib/data/server";
import { formatPlain, isRtl, pick } from "@/lib/l10n";
import { HadithListItem } from "@/components/hadith/HadithListItem";
import { Pager } from "@/components/site/Pager";
import { pageAlternates } from "@/lib/site";

const PAGE_SIZE = 25;

interface Props { params: Promise<{ locale: string; collection: string; book: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, collection, book } = await params;
  if (!isCollectionSlug(collection)) return {};
  const data = getBook(collection, Number(book));
  if (!data) return {};
  return {
    title: `${pick(COLLECTIONS[collection].name, locale)} · ${isRtl(locale) ? data.book.ar || data.book.en : data.book.en}`,
    alternates: pageAlternates(locale, `/${collection}/book/${data.book.n}`),
  };
}

export default async function BookPage({ params, searchParams }: Props) {
  const { locale, collection, book } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);
  if (!isCollectionSlug(collection) || !/^\d+$/.test(book)) notFound();
  const data = getBook(collection, Number(book));
  if (!data) notFound();
  const t = await getTranslations("Collections");
  const pages = Math.max(1, Math.ceil(data.hadiths.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(pageParam) || 1));
  const list = data.hadiths.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rtl = isRtl(locale);
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <nav className="flex flex-wrap gap-1 text-sm text-muted-foreground">
          <Link href="/collections" className="hover:text-foreground">{t("title")}</Link>
          <span aria-hidden>/</span>
          <Link href={`/${collection}`} className="hover:text-foreground">{pick(COLLECTIONS[collection].name, locale)}</Link>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("bookN", { n: formatPlain(data.book.n, locale) })}: {rtl ? data.book.ar || data.book.en : data.book.en}</h1>
        <p className="font-amiri text-xl text-muted-foreground" lang="ar" dir="rtl">{rtl ? data.book.en : data.book.ar}</p>
        <p className="text-sm text-muted-foreground">{t("count", { count: data.hadiths.length })}</p>
      </header>
      <ul className="space-y-3">
        {list.map((h) => (
          <li key={h.key}><HadithListItem h={h} locale={locale} /></li>
        ))}
      </ul>
      <Pager page={page} pages={pages} hrefFor={(p) => `/${collection}/book/${book}?page=${p}`} />
    </div>
  );
}
