import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, GitBranch, Scale } from "lucide-react";
import { Link } from "@/i18n/routing";
import { COLLECTIONS, COLLECTION_SLUGS, isSahihayn } from "@/lib/collections";
import { getBookSummary, getHadith, getHadiths, isCollectionSlug, summaries } from "@/lib/data/server";
import type { HadithRecord } from "@/lib/data/types";
import { edgesOf, mergeChains } from "@/lib/graph/merge";
import { graphLabels } from "@/lib/graph/labels";
import { formatPlain, isRtl, pick } from "@/lib/l10n";
import { correctionUrl, pageAlternates, SITE_URL } from "@/lib/site";
import { TERMS } from "@/lib/vocab/terms";
import { TransmissionGraph } from "@/components/graph/TransmissionGraph";
import { GraphExport } from "@/components/graph/GraphExport";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { HadithText } from "@/components/hadith/HadithText";
import { HadithActions } from "@/components/hadith/HadithActions";
import { ChainNotes } from "@/components/hadith/ChainNotes";
import { NarratorRow } from "@/components/narrator/NarratorRow";
import { Section } from "@/components/site/Section";

const COMPILERS = new Set(COLLECTION_SLUGS.map((c) => COLLECTIONS[c].compilerId));
const FEATURED = ["bukhari/1", "bukhari/6502", "muslim/1907a", "muslim/8a", "abudawud/2201", "tirmidhi/1647", "nasai/75"];

interface Props { params: Promise<{ locale: string; collection: string; number: string }> }

export function generateStaticParams() {
  return FEATURED.map((k) => {
    const [collection, number] = k.split("/");
    return { collection, number };
  });
}

function load(collection: string, number: string): HadithRecord | null {
  return isCollectionSlug(collection) ? getHadith(collection, decodeURIComponent(number)) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, collection, number } = await params;
  const h = load(collection, number);
  if (!h) return {};
  const name = pick(COLLECTIONS[h.c].name, locale);
  const title = `${name} ${h.ref.std ?? h.slug}`;
  const matn = h.ar.slice(h.matnStart ?? 0);
  const description = (locale === "en" && h.en ? h.en : matn).slice(0, 180);
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/${h.c}/${h.slug}`),
    openGraph: { title, description, type: "article" },
  };
}

export default async function HadithPage({ params }: Props) {
  const { locale, collection, number } = await params;
  setRequestLocale(locale);
  const h = load(collection, number);
  if (!h) notFound();

  const t = await getTranslations("Hadith");
  const info = COLLECTIONS[h.c];
  const collectionName = pick(info.name, locale);
  const book = getBookSummary(h.c, h.book);
  const bookTitle = book ? (isRtl(locale) ? book.ar || book.en : book.en) : "";
  const related = getHadiths(h.related.slice(0, 12).map(([k]) => k));
  const ids = new Set<string>([...h.graph.nodes, ...h.chain, ...h.inferred, ...h.notes.flatMap((n) => n.ids), ...related.flatMap((r) => r.graph.nodes)]);
  const people = summaries(ids);
  const labels = await graphLabels(locale);
  const reference = `${collectionName} ${h.ref.std ?? h.slug}`;
  const citationEn = `${info.name.en} ${h.ref.std ?? h.slug}${book ? `, ${book.en}` : ""}`;
  const url = `${SITE_URL}/${locale}/${h.c}/${h.slug}`;

  // How each narrator received the report from the one above them.
  const received = new Map<string, string | null>();
  for (const [from, to, term] of h.graph.edges) if (!received.has(to)) received.set(to, term ?? from);
  const merged = related.length ? mergeChains([h, ...related], COMPILERS) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: citationEn,
    inLanguage: "ar",
    text: h.ar,
    isPartOf: { "@type": "Book", name: info.name.en, author: { "@type": "Person", name: people[info.compilerId]?.en } },
    url,
  };

  return (
    <article className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="space-y-4">
        <nav aria-label={t("breadcrumb")} className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/collections" className="hover:text-foreground">{t("collections")}</Link>
          <span aria-hidden>/</span>
          <Link href={`/${h.c}`} className="hover:text-foreground">{collectionName}</Link>
          {book && (
            <>
              <span aria-hidden>/</span>
              <Link href={`/${h.c}/book/${book.n}`} className="hover:text-foreground">{t("bookN", { n: formatPlain(book.n, locale) })}: {bookTitle}</Link>
            </>
          )}
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{reference}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {h.ref.inBook && t("inBook", { book: h.ref.inBook[0], hadith: h.ref.inBook[1] })}
              {h.ref.usc && ` · ${t("usc", { ref: h.ref.usc })}`}
              {!h.ref.std && t("noStandardRef", { n: h.datasetNo })}
            </p>
          </div>
          <HadithActions citation={citationEn} arabic={h.ar} english={h.en} url={url} reportUrl={correctionUrl(citationEn, url)} jsonUrl={`/api/v1/hadiths/${h.key}`} />
        </div>
      </header>

      <Section title={t("gradings")} icon={Scale}>
        {h.grades.length ? (
          <div className="space-y-2">
            <ul className="grid gap-2 sm:grid-cols-2">
              {h.grades.map(([grader, grade]) => (
                <li key={grader} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{grader}</span>
                  <span className="font-semibold" dir="ltr">{grade}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t("gradingsSource")}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{isSahihayn(h.c) ? t("sahihainNote") : t("noGradings")}</p>
        )}
      </Section>

      <section className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm md:p-8">
        <HadithText h={h} people={people} locale={locale} />
        <p className="text-xs text-muted-foreground">{t("textHelp")}</p>
        <div className="border-t pt-5">
          {h.en ? (
            <div className="space-y-2">
              <p className="text-lg leading-relaxed" lang="en" dir="ltr">{h.en}</p>
              <p className="text-xs text-muted-foreground">{h.enSource === "hadith-api" ? t("translationApi") : t("translationDataset")}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noTranslation")}</p>
          )}
        </div>
      </section>

      <Section title={t("chain")} icon={GitBranch} description={t("chainHelp")}>
        {h.graph.nodes.length ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-muted/20 p-4">
              <TransmissionGraph svgId="chain-graph" title={t("chainTitle", { ref: reference })} nodes={h.graph.nodes} edges={edgesOf(h)} people={people} locale={locale} compilers={COMPILERS} labels={labels} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <GraphLegend />
              <GraphExport svgId="chain-graph" fileName={`${h.c}-${h.slug}-isnad`} caption={`${citationEn} · Sahih Explorer`} />
            </div>
            <details className="rounded-lg border">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t("chainList")}</summary>
              <ol className="divide-y">
                {h.graph.nodes.map((id) => {
                  const p = people[id];
                  const via = received.get(id);
                  const term = via && via in TERMS ? TERMS[via as keyof typeof TERMS] : null;
                  return p ? (
                    <li key={id}>
                      <NarratorRow n={p} locale={locale} extra={term ? <span title={pick(term.description, locale)} className="font-amiri text-sm">{term.ar}</span> : h.inferred.includes(id) ? t("inferredShort") : null} />
                    </li>
                  ) : (
                    <li key={id} className="px-3 py-2 text-sm text-muted-foreground">{t("unidentified", { id })}</li>
                  );
                })}
              </ol>
            </details>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noChain")}</p>
        )}
      </Section>

      <Section title={t("notes")}>
        <ChainNotes notes={h.notes} people={people} locale={locale} />
      </Section>

      {merged && (
        <Section title={t("related")} description={t("relatedHelp")}>
          <div className="space-y-5">
            <ul className="grid gap-2 md:grid-cols-2">
              {related.map((r) => (
                <li key={r.key}>
                  <Link href={`/${r.c}/${r.slug}`} className="block h-full rounded-lg border p-3 transition-colors hover:bg-accent">
                    <span className="text-sm font-semibold text-primary">{pick(COLLECTIONS[r.c].name, locale)} {r.ref.std ?? r.slug}</span>
                    {locale === "en" && r.en ? (
                      <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.en}</span>
                    ) : (
                      <span className="mt-1 line-clamp-2 font-amiri text-base text-muted-foreground" dir="rtl">{r.ar.slice(r.matnStart ?? 0, (r.matnStart ?? 0) + 200)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <Stat label={t("statChains")} value={related.length + 1} />
              <Stat label={t("statSources")} value={merged.sources.length} />
              <Stat label={t("statCollections")} value={new Set([h, ...related].map((r) => r.c)).size} />
            </div>
            <div className="overflow-x-auto rounded-xl border bg-muted/20 p-4">
              <TransmissionGraph svgId="merged-graph" title={t("mergedTitle", { ref: reference })} nodes={merged.nodes} edges={merged.edges} people={people} locale={locale} compilers={COMPILERS} labels={labels} highlight={new Set(h.graph.nodes)} showTerms={false} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t("mergedHelp")}</p>
              <GraphExport svgId="merged-graph" fileName={`${h.c}-${h.slug}-chains`} caption={`${citationEn} · ${t("statChains")}: ${related.length + 1} · Sahih Explorer`} />
            </div>
            {merged.meetingPoints.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t("meetingPoints")}</h3>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {merged.meetingPoints.slice(0, 8).map(({ id, count }) =>
                    people[id] ? (
                      <li key={id}>
                        <NarratorRow n={people[id]} locale={locale} extra={t("throughChains", { count })} />
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      <nav className="flex items-center justify-between gap-4 border-t pt-6 text-sm" aria-label={t("pager")}>
        {h.prev ? (
          <Link href={`/${h.prev}`} className="flex items-center gap-1 hover:underline">
            <ChevronLeft className="size-4 rtl:rotate-180" /> {t("previous")}
          </Link>
        ) : <span />}
        {h.next ? (
          <Link href={`/${h.next}`} className="flex items-center gap-1 hover:underline">
            {t("next")} <ChevronRight className="size-4 rtl:rotate-180" />
          </Link>
        ) : <span />}
      </nav>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}
