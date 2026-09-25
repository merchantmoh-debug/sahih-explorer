"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useDebounce } from "use-debounce";
import { BookOpen, Loader2, Search, User } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { OPEN_SEARCH_EVENT } from "@/components/site/SearchButton";
import { COLLECTIONS, type CollectionSlug } from "@/lib/collections";
import { GRADES, type GradeKey } from "@/lib/vocab/grades";
import { formatPlain, pick } from "@/lib/l10n";

interface NarratorHit { id: string; name: { en: string; ar: string }; grade: { key: GradeKey }; deathAH: number | null; hadithCount: number }
interface HadithHit { key: string; snippetEn: string; snippetAr: string }
interface Results { narrators: NarratorHit[]; hadiths: { reference: string | null; total: number; results: HadithHit[] } }

const EXAMPLES = ["bukhari 1", "muslim 1907a", "أبو هريرة", "Anas bin Malik", "intentions"];

export function CommandPalette() {
  const t = useTranslations("Search");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced] = useDebounce(q.trim(), 220);
  const [fetched, setFetched] = useState<{ q: string; data: Results } | null>(null);
  const results = debounced && fetched?.q === debounced ? fetched.data : null;
  const loading = Boolean(debounced) && fetched?.q !== debounced;
  const rtl = locale !== "en";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = (e: Event) => {
      const query = (e as CustomEvent<{ query?: string }>).detail?.query ?? "";
      if (query) setQ(query);
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!debounced) return;
    const ctrl = new AbortController();
    fetch(`/api/v1/search?type=all&limit=8&q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: Results) => setFetched({ q: debounced, data }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [debounced]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const refLabel = (key: string) => {
    const [c, n] = key.split("/");
    return `${pick(COLLECTIONS[c as CollectionSlug].name, locale)} ${n}`;
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={t("title")} shouldFilter={false}>
      <CommandInput value={q} onValueChange={setQ} placeholder={t("placeholder")} dir="auto" />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("loading")}
          </div>
        )}
        {!q && (
          <CommandGroup heading={t("try")}>
            {EXAMPLES.map((ex) => (
              <CommandItem key={ex} value={ex} onSelect={() => setQ(ex)}>
                <Search className="me-2 size-4 opacity-60" />
                <span dir="auto">{ex}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results && !loading && !results.narrators.length && !results.hadiths.results.length && <CommandEmpty>{t("noResults")}</CommandEmpty>}
        {results && results.narrators.length > 0 && (
          <CommandGroup heading={t("narrators")}>
            {results.narrators.map((n) => (
              <CommandItem key={n.id} value={`n-${n.id}`} onSelect={() => go(`/scholar/${n.id}`)} className="gap-3">
                <User className="size-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{rtl ? n.name.ar || n.name.en : n.name.en}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {pick(GRADES[n.grade.key].label, locale)}
                    {n.deathAH !== null && ` · ${t("died", { year: formatPlain(n.deathAH, locale) })}`}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results && results.hadiths.results.length > 0 && (
          <CommandGroup heading={t("hadiths", { count: results.hadiths.total })}>
            {results.hadiths.results.map((h) => (
              <CommandItem key={h.key} value={`h-${h.key}`} onSelect={() => go(`/${h.key}`)} className="items-start gap-3">
                <BookOpen className="mt-1 size-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-primary">{refLabel(h.key)}</div>
                  {!rtl && h.snippetEn ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{h.snippetEn}</p>
                  ) : (
                    <p className="line-clamp-2 font-amiri text-sm text-muted-foreground" dir="rtl">{h.snippetAr}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {debounced && (
          <CommandGroup>
            <CommandItem value="all-results" onSelect={() => go(`/search?q=${encodeURIComponent(debounced)}`)}>
              <Search className="me-2 size-4" /> {t("allResults", { q: debounced })}
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
