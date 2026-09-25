import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getMeta } from "@/lib/data/server";
import { formatNumber } from "@/lib/l10n";
import { pageAlternates, REPO_URL } from "@/lib/site";
import { Section } from "@/components/site/Section";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("title"), description: t("intro"), alternates: pageAlternates(locale, "/about") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const m = getMeta();
  const f = (n: number) => formatNumber(n, locale);
  const pct = (a: number, b: number) => `${Math.round((a / b) * 1000) / 10}%`;
  const c = m.counts;

  const steps = [
    t("step1", { narrators: f(c.narrators), hadiths: f(c.hadiths) }),
    t("step2", { share: pct(m.alignment.narratorsAligned, m.alignment.narratorsInChains) }),
    t("step3", { inferred: f(c.inferred) }),
    t("step4", { matched: f(c.matchedToStandard), graded: f(c.graded) }),
    t("step5", { groups: f(c.clusters), hadiths: f(c.clusteredHadiths) }),
  ];
  const limits = [
    t("limitDeaths", { share: pct(c.withDeathYear, c.narrators) }),
    t("limitGaps", { count: f(c.withGaps) }),
    t("limitIdentity"),
    t("limitEnglish", { count: f(c.hadiths - c.withEnglish) }),
    t("limitCoverage"),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("intro")}</p>
      </header>
      <Section title={t("howTitle")}>
        <ol className="list-decimal space-y-2 ps-6 leading-relaxed">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </Section>
      <Section title={t("notTitle")}>
        <p className="leading-relaxed text-muted-foreground">{t("not")}</p>
      </Section>
      <Section title={t("sourcesTitle")}>
        <ul className="list-disc space-y-2 ps-6 leading-relaxed text-muted-foreground">
          <li>{t("sourceDataset")}</li>
          <li>{t("sourceApi")} <a className="underline" href="https://github.com/fawazahmed0/hadith-api" rel="noopener">github.com/fawazahmed0/hadith-api</a></li>
          <li>{t("sourceMap")}</li>
          <li>{t("sourceWikipedia")}</li>
        </ul>
      </Section>
      <Section title={t("limitsTitle")}>
        <ul className="list-disc space-y-2 ps-6 leading-relaxed text-muted-foreground">{limits.map((s) => <li key={s}>{s}</li>)}</ul>
      </Section>
      <Section title={t("correctionsTitle")}>
        <p className="leading-relaxed text-muted-foreground">
          {t("corrections")} <a className="underline" href={`${REPO_URL}/issues/new/choose`} rel="noopener">{t("openIssue")}</a>
        </p>
      </Section>
      <Section title={t("licenseTitle")}>
        <p className="leading-relaxed text-muted-foreground">
          {t("license")} <Link href="/developers" className="underline">{t("developers")}</Link>
        </p>
        <p className="text-xs text-muted-foreground">{t("built", { date: m.builtAt.slice(0, 10), hash: m.sourceHash })}</p>
      </Section>
    </div>
  );
}
