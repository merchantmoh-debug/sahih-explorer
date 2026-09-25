import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageAlternates, REPO_URL, SITE_URL } from "@/lib/site";
import { Section } from "@/components/site/Section";

const ENDPOINTS = [
  ["/api/v1", "index"],
  ["/api/v1/collections", "collections"],
  ["/api/v1/collections/bukhari", "collection"],
  ["/api/v1/collections/bukhari/books/1", "book"],
  ["/api/v1/hadiths/bukhari/1", "hadith"],
  ["/api/v1/narrators/13", "narrator"],
  ["/api/v1/narrators/13/hadiths?page=2&collection=muslim", "narratorHadiths"],
  ["/api/v1/search?q=intentions&type=all", "search"],
  ["/api/v1/connect?teacher=11014&student=20001", "connect"],
  ["/api/v1/meta", "meta"],
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Developers" });
  return { title: t("title"), description: t("intro"), alternates: pageAlternates(locale, "/developers") };
}

export default async function DevelopersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Developers");
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("intro")}</p>
      </header>
      <Section title={t("apiTitle")} description={t("apiHelp")}>
        <ul className="divide-y rounded-2xl border" dir="ltr">
          {ENDPOINTS.map(([path, key]) => (
            <li key={path} className="space-y-1 p-4">
              <a href={path} className="break-all font-mono text-sm text-primary underline-offset-4 hover:underline">GET {path}</a>
              <p className="text-sm text-muted-foreground" dir="auto">{t(`endpoint.${key}`)}</p>
            </li>
          ))}
        </ul>
        <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs" dir="ltr"><code>{`curl ${SITE_URL}/api/v1/hadiths/muslim/1907a`}</code></pre>
      </Section>
      <Section title={t("datasetTitle")}>
        <p className="leading-relaxed text-muted-foreground">
          {t("dataset")} <a className="underline" href={`${REPO_URL}/releases`} rel="noopener">{t("releases")}</a>
        </p>
      </Section>
      <Section title={t("buildTitle")}>
        <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs" dir="ltr"><code>{`git clone ${REPO_URL}\nnpm ci\nnpm run data:build   # data/source → data/build, with integrity checks\nnpm test\nnpm run dev`}</code></pre>
        <p className="text-sm text-muted-foreground">{t("build")} <a className="underline" href={`${REPO_URL}/blob/main/DATA.md`} rel="noopener">DATA.md</a></p>
      </Section>
      <Section title={t("termsTitle")}>
        <p className="leading-relaxed text-muted-foreground">{t("terms")}</p>
      </Section>
    </div>
  );
}
