import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getNarratorIndex } from "@/lib/data/server";
import { GENERATIONS } from "@/lib/vocab/generations";
import { GRADES, GRADE_KEYS, type GradeKey } from "@/lib/vocab/grades";
import { GRADING_TERMS } from "@/lib/vocab/hadith-grades";
import { TERMS, TERM_KEYS } from "@/lib/vocab/terms";
import { formatNumber, pick } from "@/lib/l10n";
import { BAND_DOT } from "@/components/narrator/GradeBadge";
import { Section } from "@/components/site/Section";
import { pageAlternates } from "@/lib/site";

const NOTE_KINDS = ["grade", "no-grade", "unidentified", "unattested", "hidden", "inferred", "nameDiffers", "genGap", "deathGap", "branched", "notMarfu", "sourceNotCompanion", "followUp"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Glossary" });
  return { title: t("title"), description: t("description"), alternates: pageAlternates(locale, "/glossary") };
}

export default async function GlossaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Glossary");
  const counts = new Map<GradeKey, number>();
  for (const row of getNarratorIndex().rows) counts.set(row[4], (counts.get(row[4]) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>

      <Section id="grades" title={t("grades")} description={t("gradesHelp")}>
        <dl className="divide-y rounded-2xl border">
          {GRADE_KEYS.filter((k) => k !== "prophet").map((k) => (
            <div key={k} id={`grade-${k}`} className="grid scroll-mt-20 gap-1 p-4 sm:grid-cols-[14rem_1fr]">
              <dt className="flex items-start gap-2 font-semibold">
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${BAND_DOT[GRADES[k].band]}`} aria-hidden />
                <span>
                  {pick(GRADES[k].label, locale)}
                  {GRADES[k].term && <span lang="ar" className="ms-2 font-amiri font-normal text-muted-foreground">{GRADES[k].term}</span>}
                </span>
              </dt>
              <dd className="text-sm text-muted-foreground">
                {pick(GRADES[k].description, locale)}
                <span className="ms-1 whitespace-nowrap">({t("narratorCount", { count: formatNumber(counts.get(k) ?? 0, locale) })})</span>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="generations" title={t("generations")} description={t("generationsHelp")}>
        <ol className="divide-y rounded-2xl border">
          {Object.entries(GENERATIONS).map(([n, g]) => (
            <li key={n} id={`generation-${n}`} className="grid scroll-mt-20 gap-1 p-4 sm:grid-cols-[14rem_1fr]">
              <span className="font-semibold">{n}. {pick(g.label, locale)}</span>
              <span className="text-sm text-muted-foreground">{pick(g.note, locale)}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="terms" title={t("terms")} description={t("termsHelp")}>
        <dl className="divide-y rounded-2xl border">
          {TERM_KEYS.map((k) => (
            <div key={k} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr]">
              <dt className="font-semibold"><span lang="ar" className="font-amiri text-lg">{TERMS[k].ar}</span> <span className="text-sm font-normal text-muted-foreground">{TERMS[k].translit}</span></dt>
              <dd className="text-sm text-muted-foreground">{pick(TERMS[k].description, locale)}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="gradings" title={t("gradings")} description={t("gradingsHelp")}>
        <dl className="divide-y rounded-2xl border">
          {GRADING_TERMS.map((g) => (
            <div key={g.key} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr]">
              <dt className="font-semibold">{pick(g.label, locale)} <span lang="ar" className="font-amiri font-normal text-muted-foreground">{g.term}</span></dt>
              <dd className="text-sm text-muted-foreground">{pick(g.description, locale)}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="notes" title={t("notes")} description={t("notesHelp")}>
        <dl className="divide-y rounded-2xl border">
          {NOTE_KINDS.map((k) => (
            <div key={k} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr]">
              <dt className="font-semibold">{t(`note.${k}.title`)}</dt>
              <dd className="text-sm text-muted-foreground">{t(`note.${k}.body`)}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
