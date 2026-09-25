import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BookOpen, Code2, GitCompareArrows, Library, Search } from "lucide-react";
import { Link } from "@/i18n/routing";
import { COLLECTIONS, COLLECTION_SLUGS, isSahihayn } from "@/lib/collections";
import { getCollections, getHadith, getMeta, getNarratorIndex, summaries } from "@/lib/data/server";
import { edgesOf } from "@/lib/graph/merge";
import { graphLabels } from "@/lib/graph/labels";
import { formatNumber, pick } from "@/lib/l10n";
import { pageAlternates } from "@/lib/site";
import { TransmissionGraph } from "@/components/graph/TransmissionGraph";
import { NarratorRow } from "@/components/narrator/NarratorRow";

const COMPILERS = new Set(COLLECTION_SLUGS.map((c) => COLLECTIONS[c].compilerId));
const EXAMPLES = ["bukhari 1", "muslim 1907a", "abudawud 2201", "intentions", "أبو هريرة"];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates(locale, "") };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const meta = getMeta();
  const collections = getCollections();
  const demo = getHadith("bukhari", "1");
  const demoPeople = demo ? summaries(demo.graph.nodes) : {};
  const labels = await graphLabels(locale);
  const top = getNarratorIndex().rows.filter(([id, , , , , cls]) => cls !== "prophet" && !COMPILERS.has(id)).slice(0, 8).map(([id]) => id);
  const topPeople = summaries(top);
  const f = (n: number) => formatNumber(n, locale);

  return (
    <div className="space-y-20 pb-10">
      <section className="bg-dots border-b">
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-16 text-center md:py-24">
          <p className="font-amiri text-2xl text-gold" lang="ar">الإسناد من الدين</p>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">{t("title")}</h1>
          <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">{t("subtitle")}</p>
          <form action={`/${locale}/search`} className="mx-auto flex max-w-xl gap-2">
            <label className="relative flex-1">
              <span className="sr-only">{t("searchPlaceholder")}</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input name="q" placeholder={t("searchPlaceholder")} dir="auto" className="h-12 w-full rounded-xl border bg-background ps-11 pe-3 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <button type="submit" className="h-12 rounded-xl bg-primary px-5 font-medium text-primary-foreground hover:opacity-90">{t("search")}</button>
          </form>
          <ul className="flex flex-wrap justify-center gap-2 text-sm">
            {EXAMPLES.map((q) => (
              <li key={q}><Link href={`/search?q=${encodeURIComponent(q)}`} prefetch={false} className="inline-block rounded-full border bg-background px-3 py-1 hover:bg-accent" dir="auto">{q}</Link></li>
            ))}
          </ul>
          <dl className="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              [t("statHadiths"), f(meta.counts.hadiths)],
              [t("statNarrators"), f(meta.counts.narrators)],
              [t("statGraded"), f(meta.counts.graded)],
              [t("statLinks"), f(meta.counts.edges)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-background/80 p-4">
                <dd className="text-2xl font-bold">{value}</dd>
                <dt className="text-sm text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {demo && (
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">{t("chainTitle")}</h2>
            <p className="leading-relaxed text-muted-foreground">{t("chainBody")}</p>
            <ul className="space-y-2 text-sm">
              <li>• {t("chainPoint1")}</li>
              <li>• {t("chainPoint2")}</li>
              <li>• {t("chainPoint3")}</li>
            </ul>
            <Link href="/bukhari/1" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              {t("chainCta")} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border bg-card p-4">
            <TransmissionGraph svgId="home-graph" title={t("chainTitle")} nodes={demo.graph.nodes} edges={edgesOf(demo)} people={demoPeople} locale={locale} compilers={COMPILERS} labels={labels} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl space-y-6 px-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">{t("collectionsTitle")}</h2>
          <Link href="/collections" className="text-sm text-primary hover:underline">{t("allCollections")}</Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link href={`/${c.slug}`} className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-gold/50">
                <span className="grid size-11 place-items-center rounded-xl bg-gold/15 text-gold"><BookOpen className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block font-semibold">{pick(COLLECTIONS[c.slug].name, locale)}</span>
                  <span className="block text-sm text-muted-foreground">{isSahihayn(c.slug) ? t("collectionCountSahih", { count: f(c.count) }) : t("collectionCount", { count: f(c.count), graded: f(c.graded) })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-3">
        {[
          { href: "/connect", icon: GitCompareArrows, title: t("toolConnect"), body: t("toolConnectBody") },
          { href: "/glossary", icon: Library, title: t("toolGlossary"), body: t("toolGlossaryBody") },
          { href: "/developers", icon: Code2, title: t("toolApi"), body: t("toolApiBody") },
        ].map((tool) => (
          <Link key={tool.href} href={tool.href} className="space-y-2 rounded-2xl border bg-card p-5 transition-colors hover:border-gold/50">
            <tool.icon className="size-6 text-gold" aria-hidden />
            <h3 className="font-semibold">{tool.title}</h3>
            <p className="text-sm text-muted-foreground">{tool.body}</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-6xl space-y-4 px-4">
        <h2 className="text-2xl font-bold tracking-tight">{t("narratorsTitle")}</h2>
        <p className="text-muted-foreground">{t("narratorsBody")}</p>
        <ul className="grid gap-1 rounded-2xl border p-2 sm:grid-cols-2 lg:grid-cols-4">
          {top.filter((id) => topPeople[id]).map((id) => (
            <li key={id}><NarratorRow n={topPeople[id]} locale={locale} /></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
