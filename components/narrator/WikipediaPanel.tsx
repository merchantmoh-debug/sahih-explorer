"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { nameEn: string; nameAr: string; deathAH: number | null; deathCE: number | null; locale: string }

interface Summary { title: string; extract: string; url: string; lang: string }

const CONTEXT = /islam|muslim|hadith|companion|sahab|tabi|successor|narrator|imam|scholar|jurist|caliph|إسلام|حديث|صحاب|تابع|فقيه|محدث|راو|إمام/i;

/** Wikipedia lookup on request. Names are ambiguous, so a result is shown only
 *  when it mentions the narrator's death year, and always as an automatic
 *  match to double-check. */
export function WikipediaPanel({ nameEn, nameAr, deathAH, deathCE, locale }: Props) {
  const t = useTranslations("Narrator");
  const [state, setState] = useState<"idle" | "loading" | "none" | "done">("idle");
  const [summary, setSummary] = useState<Summary | null>(null);
  const lang = locale === "ar" ? "ar" : locale === "ckb" ? "ckb" : "en";
  const term = lang === "en" ? nameEn.replace(/\([^)]*\)/g, "").trim() : nameAr;
  const searchUrl = `https://${lang}.wikipedia.org/w/index.php?search=${encodeURIComponent(term)}`;

  const plausible = (text: string) => {
    if (!CONTEXT.test(text)) return false;
    const years = [deathAH, deathCE].filter((y): y is number => y !== null);
    if (!years.length) return false;
    return years.some((y) => new RegExp(`(^|\\D)${y}(\\D|$)`).test(text));
  };

  const lookup = async () => {
    setState("loading");
    try {
      const api = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srlimit=3&format=json&origin=*`;
      const res = await fetch(api).then((r) => r.json());
      for (const hit of res?.query?.search ?? []) {
        const s = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`).then((r) => (r.ok ? r.json() : null));
        if (s?.extract && plausible(`${s.extract} ${s.description ?? ""}`)) {
          setSummary({ title: s.title, extract: s.extract, url: s.content_urls?.desktop?.page ?? searchUrl, lang });
          setState("done");
          return;
        }
      }
      setState("none");
    } catch {
      setState("none");
    }
  };

  return (
    <div className="space-y-3 rounded-xl border p-4 text-sm">
      {state === "idle" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">{t("wikiPrompt")}</p>
          <Button variant="outline" size="sm" onClick={lookup}>{t("wikiLookup")}</Button>
        </div>
      )}
      {state === "loading" && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t("loading")}</p>}
      {state === "none" && (
        <p className="text-muted-foreground">
          {t("wikiNone")} <a href={searchUrl} target="_blank" rel="noopener" className="underline">{t("wikiSearch")}</a>
        </p>
      )}
      {state === "done" && summary && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gold">{t("wikiAutomatic")}</p>
          <p className="font-semibold" dir="auto">{summary.title}</p>
          <p className="leading-relaxed text-muted-foreground" dir="auto" lang={summary.lang}>{summary.extract}</p>
          <a href={summary.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline">
            {t("wikiRead")} <ExternalLink className="size-3" />
          </a>
        </div>
      )}
    </div>
  );
}
