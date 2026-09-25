import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { Link } from "@/i18n/routing";
import { COLLECTIONS, isSahihayn } from "@/lib/collections";
import { getCollections, summaries } from "@/lib/data/server";
import { displayName, formatNumber, formatPlain, pick } from "@/lib/l10n";
import { pageAlternates } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Collections" });
  return { title: t("title"), description: t("description"), alternates: pageAlternates(locale, "/collections") };
}

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Collections");
  const collections = getCollections();
  const compilers = summaries(collections.map((c) => COLLECTIONS[c.slug].compilerId));
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => {
          const compiler = compilers[COLLECTIONS[c.slug].compilerId];
          return (
            <li key={c.slug}>
              <Link href={`/${c.slug}`} className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-gold/50">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold"><BookOpen className="size-5" /></span>
                  <div>
                    <h2 className="font-semibold">{pick(COLLECTIONS[c.slug].name, locale)}</h2>
                    <p className="font-amiri text-muted-foreground" lang="ar">{COLLECTIONS[c.slug].name.ar}</p>
                  </div>
                </div>
                {compiler && <p className="text-sm text-muted-foreground">{t("compiledBy", { name: displayName(compiler, locale), year: compiler.d !== null ? formatPlain(compiler.d, locale) : "?" })}</p>}
                <dl className="mt-auto grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted/60 p-2"><dt className="text-muted-foreground">{t("hadiths")}</dt><dd className="text-base font-semibold">{formatNumber(c.count, locale)}</dd></div>
                  <div className="rounded-lg bg-muted/60 p-2"><dt className="text-muted-foreground">{t("books")}</dt><dd className="text-base font-semibold">{formatNumber(c.books.length, locale)}</dd></div>
                  <div className="rounded-lg bg-muted/60 p-2"><dt className="text-muted-foreground">{t("graded")}</dt><dd className="text-base font-semibold">{isSahihayn(c.slug) ? t("sahih") : c.graded ? formatNumber(c.graded, locale) : "—"}</dd></div>
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="max-w-3xl text-sm text-muted-foreground">{t("gradesNote")}</p>
    </div>
  );
}
