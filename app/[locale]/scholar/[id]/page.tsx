import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpen, Calendar, Code2, Flag, MapPin, Network, Users } from "lucide-react";
import { Link } from "@/i18n/routing";
import { COLLECTIONS, COLLECTION_SLUGS, type CollectionSlug } from "@/lib/collections";
import { publicHadithSummary } from "@/lib/api";
import { getHadiths, getNarrator, summaries } from "@/lib/data/server";
import type { LifeEvent, NarratorLink, NarratorRecord } from "@/lib/data/types";
import { CLASS_LABELS, GENERATIONS, MADHHAB_LABELS } from "@/lib/vocab/generations";
import { GRADES } from "@/lib/vocab/grades";
import { PLACE_BY_KEY } from "@/lib/vocab/places";
import { translateTag } from "@/lib/vocab/tags";
import { TERMS, type TermKey } from "@/lib/vocab/terms";
import { displayName, formatNumber, formatPlain, isRtl, pick, secondaryName } from "@/lib/l10n";
import { correctionUrl, pageAlternates, SITE_URL } from "@/lib/site";
import { Section } from "@/components/site/Section";
import { GradeBadge } from "@/components/narrator/GradeBadge";
import { NarratorName } from "@/components/narrator/NarratorName";
import { NarratorRow } from "@/components/narrator/NarratorRow";
import { NarratorNetwork } from "@/components/narrator/NarratorNetwork";
import { PlacesMap, type MapPoint } from "@/components/narrator/PlacesMap";
import { Bars } from "@/components/narrator/Bars";
import { NarratorHadiths, type HadithSummary } from "@/components/narrator/NarratorHadiths";
import { WikipediaPanel } from "@/components/narrator/WikipediaPanel";

interface Props { params: Promise<{ locale: string; id: string }> }

const FEATURED = ["13", "53", "19", "11013", "30001", "30003"];

export function generateStaticParams() {
  return FEATURED.map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const n = getNarrator(id);
  if (!n) return {};
  const t = await getTranslations({ locale, namespace: "Narrator" });
  const name = displayName(n, locale);
  return {
    title: name,
    description: t("metaDescription", { name, grade: pick(GRADES[n.g].label, locale), count: n.n }),
    alternates: pageAlternates(locale, `/scholar/${id}`),
    openGraph: { title: name, type: "profile" },
  };
}

export default async function NarratorPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const n = getNarrator(id);
  if (!n) notFound();
  const t = await getTranslations("Narrator");
  const g = await getTranslations("Glossary");
  const prophet = n.cls === "prophet";
  const people = summaries([
    n.id, ...n.teachers.slice(0, 60).map((x) => x.id), ...n.students.slice(0, 60).map((x) => x.id), ...n.sameName,
    ...n.family.parents, ...n.family.spouses, ...n.family.siblings, ...n.family.children,
  ]);
  const self = people[n.id];
  const initial = getHadiths(n.hadiths.slice(0, 10)).map(publicHadithSummary) as HadithSummary[];
  const url = `${SITE_URL}/${locale}/scholar/${n.id}`;
  const rtl = isRtl(locale);

  const year = (e: LifeEvent | null) => {
    if (!e || (e.ah === null && e.ce === null)) return null;
    const parts = [];
    if (e.ah !== null) parts.push(e.ah < 0 ? t("yearBH", { year: formatPlain(-e.ah, locale) }) : t("yearAH", { year: formatPlain(e.ah, locale) }));
    if (e.ce !== null) parts.push(t("yearCE", { year: formatPlain(e.ce, locale) }));
    return parts.join(" · ");
  };
  const placeName = (e: LifeEvent | null) => {
    if (!e) return null;
    const known = e.placeKeys.map((k) => PLACE_BY_KEY.get(k)).filter(Boolean);
    if (known.length) return known.map((p) => pick(p!.name, locale)).join("، ");
    return locale === "en" ? e.place : null;
  };

  const points: MapPoint[] = [
    ...(n.birth?.placeKeys ?? []).map((key) => ({ key, kind: "birth" as const })),
    ...(n.death?.placeKeys ?? []).map((key) => ({ key, kind: "death" as const })),
    ...n.places.filter((p) => p.key).map((p) => ({ key: p.key!, kind: "stay" as const })),
  ].filter((p, i, all) => all.findIndex((q) => q.key === p.key) === i);

  const linkList = (list: NarratorLink[], limit = 60) =>
    list.slice(0, limit).filter((l) => people[l.id]).map((l) => (
      <li key={l.id}>
        <NarratorRow n={people[l.id]} locale={locale} extra={l.n ? t("inChains", { count: l.n }) : t("listedOnly")} />
      </li>
    ));

  const collections = (Object.entries(n.stats.byCollection) as [CollectionSlug, number][]).sort((a, b) => COLLECTION_SLUGS.indexOf(a[0]) - COLLECTION_SLUGS.indexOf(b[0]));
  const terms = (Object.entries(n.stats.termsReceived) as [TermKey, number][]).sort((a, b) => b[1] - a[1]);
  const family = (Object.entries(n.family) as [keyof NarratorRecord["family"], string[]][]).filter(([, ids]) => ids.some((x) => people[x]));

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <header className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gold">{pick(CLASS_LABELS[n.cls], locale)}</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            <NarratorName n={self} locale={locale} />
          </h1>
          {secondaryName(n, locale) && <p className="text-xl text-muted-foreground" dir="auto">{secondaryName(n, locale)}</p>}
          {n.arFull !== n.ar && <p className="font-amiri text-lg text-muted-foreground" lang="ar" dir="rtl">{n.arFull}</p>}
        </div>
        {!prophet && (
          <div className="flex flex-wrap items-center gap-2">
            <GradeBadge grade={n.g} locale={locale} />
            {n.gen && (
              <Link href={`/glossary#generation-${n.gen}`} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent" title={pick(GENERATIONS[n.gen].note, locale)}>
                {t("generation", { n: formatPlain(n.gen, locale) })}: {pick(GENERATIONS[n.gen].label, locale)}
              </Link>
            )}
            {n.madhhab && <span className="rounded-full border px-2.5 py-0.5 text-xs">{pick(MADHHAB_LABELS[n.madhhab], locale)}</span>}
            {n.verdictAr && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs" title={t("verdictHelp")}>
                {t("verdict")}: <span lang="ar" className="font-amiri text-sm">{n.verdictAr}</span>
                {n.books && <span className="ms-1 font-amiri text-muted-foreground" lang="ar">[{n.books}]</span>}
              </span>
            )}
          </div>
        )}
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={Calendar} label={t("born")} value={year(n.birth)} sub={placeName(n.birth)} unknown={t("unknown")} />
          <Fact icon={Calendar} label={t("died")} value={year(n.death)} sub={[placeName(n.death), n.death?.martyred ? t("martyred") : null].filter(Boolean).join(" · ") || null} unknown={t("unknown")} />
          <Fact icon={BookOpen} label={t("hadithRecords")} value={formatNumber(n.n, locale)} />
          <Fact icon={Users} label={t("teachersStudents")} value={`${formatNumber(n.teachers.length, locale)} / ${formatNumber(n.students.length, locale)}`} />
        </dl>
        <div className="flex flex-wrap gap-3 text-sm">
          <a href={correctionUrl(`${n.en} (${n.id})`, url)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Flag className="size-4" /> {t("report")}</a>
          <a href={`/api/v1/narrators/${n.id}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Code2 className="size-4" /> {t("json")}</a>
        </div>
      </header>

      {n.sameName.length > 0 && (
        <Section title={t("sameName")} description={t("sameNameHelp", { count: n.sameNameTotal })}>
          <ul className="grid gap-1 rounded-xl border p-2 sm:grid-cols-2">
            {n.sameName.filter((x) => people[x]).map((x) => (
              <li key={x}><NarratorRow n={people[x]} locale={locale} extra={t("records", { count: people[x].n })} /></li>
            ))}
          </ul>
        </Section>
      )}

      {(n.teachers.length > 0 || n.students.length > 0) && (
        <Section title={prophet ? t("companionsWhoNarrate") : t("network")} icon={Network} description={t("networkHelp")}>
          <div className="rounded-xl border bg-muted/20 p-2">
            <NarratorNetwork center={self} teachers={n.teachers} students={n.students} people={people} locale={locale} title={t("networkTitle", { name: displayName(self, locale) })} />
          </div>
          <div className={`grid gap-6 ${prophet ? "" : "md:grid-cols-2"}`}>
            {!prophet && (
              <div className="space-y-2">
                <h3 className="font-semibold">{t("teachers", { count: n.teachers.length })}</h3>
                <ul className="max-h-[28rem] overflow-y-auto rounded-xl border p-1">{n.teachers.length ? linkList(n.teachers) : <li className="p-3 text-sm text-muted-foreground">{t("none")}</li>}</ul>
              </div>
            )}
            <div className="space-y-2">
              <h3 className="font-semibold">{prophet ? t("companionsCount", { count: n.students.length }) : t("students", { count: n.students.length })}</h3>
              <ul className={`max-h-[28rem] overflow-y-auto rounded-xl border p-1 ${prophet ? "grid sm:grid-cols-2" : ""}`}>{n.students.length ? linkList(n.students) : <li className="p-3 text-sm text-muted-foreground">{t("none")}</li>}</ul>
            </div>
          </div>
          {!prophet && <p className="text-xs text-muted-foreground">{t("linksHelp")}</p>}
        </Section>
      )}

      {!prophet && collections.length > 0 && (
        <Section title={t("inTheCollections")}>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{t("byCollection")}</h3>
              <Bars locale={locale} rows={collections.map(([c, v]) => ({ label: pick(COLLECTIONS[c].name, locale), value: v }))} />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{t("positions")}</h3>
              <Bars locale={locale} rows={[
                { label: t("positionSource"), value: n.stats.positions.source },
                { label: t("positionMiddle"), value: n.stats.positions.middle },
                { label: t("positionCompiler"), value: n.stats.positions.compiler },
              ]} />
              {terms.length > 0 && (
                <>
                  <h3 className="pt-3 text-sm font-semibold">{t("termsReceived")}</h3>
                  <Bars locale={locale} rows={terms.slice(0, 6).map(([k, v]) => ({ label: <span><span lang="ar" className="font-amiri">{TERMS[k].ar}</span> · {pick(TERMS[k].label, locale)}</span>, value: v, hint: pick(TERMS[k].description, locale) }))} />
                  <p className="text-xs text-muted-foreground">{t("termsHelp")} <Link href="/glossary#terms" className="underline">{g("terms")}</Link></p>
                </>
              )}
            </div>
          </div>
        </Section>
      )}

      {family.length > 0 && (
        <Section title={t("family")} icon={Users}>
          <div className="grid gap-4 sm:grid-cols-2">
            {family.map(([rel, ids]) => (
              <div key={rel} className="space-y-1">
                <h3 className="text-sm font-semibold">{t(`rel.${rel}`)}</h3>
                <ul className="rounded-xl border p-1">
                  {ids.filter((x) => people[x]).map((x) => <li key={x}><NarratorRow n={people[x]} locale={locale} /></li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(points.length > 0 || n.tags.length > 0 || n.interests.length > 0) && (
        <Section title={t("placesAndTags")} icon={MapPin}>
          <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
            {points.length > 0 ? (
              <PlacesMap points={points} locale={locale} title={t("mapTitle", { name: displayName(self, locale) })} legend={{ birth: t("born"), death: t("died"), stay: t("lived") }} />
            ) : <div />}
            <div className="space-y-4 text-sm">
              {n.places.length > 0 && (
                <div className="space-y-1">
                  <h3 className="font-semibold">{t("lived")}</h3>
                  <p className="text-muted-foreground">{n.places.map((p) => (p.key ? pick(PLACE_BY_KEY.get(p.key)!.name, locale) : p.raw)).join(rtl ? "، " : ", ")}</p>
                </div>
              )}
              {n.tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">{t("tags")}</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {n.tags.map((tag) => {
                      const tr = translateTag(tag, locale as "en" | "ar" | "ckb");
                      return <li key={tag} className="rounded-full border px-2.5 py-0.5 text-xs" dir={tr.translated ? undefined : "ltr"}>{tr.text}</li>;
                    })}
                  </ul>
                </div>
              )}
              {n.interests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">{t("interests")}</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {n.interests.map((x) => {
                      const tr = translateTag(x, locale as "en" | "ar" | "ckb");
                      return <li key={x} className="rounded-full bg-muted px-2.5 py-0.5 text-xs" dir={tr.translated ? undefined : "ltr"}>{tr.text}</li>;
                    })}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t("mapHelp")}</p>
            </div>
          </div>
        </Section>
      )}

      <Section title={t("hadiths")} icon={BookOpen}>
        {prophet ? (
          <p className="text-sm text-muted-foreground">
            {t("prophetHadiths", { count: formatNumber(n.n, locale) })} <Link href="/collections" className="underline">{t("browseCollections")}</Link>
          </p>
        ) : n.hadiths.length ? (
          <NarratorHadiths narratorId={n.id} total={n.hadiths.length} byCollection={n.stats.byCollection} initial={initial} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("noHadiths")}</p>
        )}
      </Section>

      {!prophet && (
        <Section title={t("wikipedia")}>
          <WikipediaPanel nameEn={n.en} nameAr={n.ar} deathAH={n.death?.ah ?? null} deathCE={n.death?.ce ?? null} locale={locale} />
        </Section>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value, sub, unknown }: { icon: typeof Calendar; label: string; value: string | null; sub?: string | null; unknown?: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
      <div>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value ?? <span className="text-muted-foreground">{unknown}</span>}</dd>
        {sub && <dd className="text-muted-foreground">{sub}</dd>}
      </div>
    </div>
  );
}
