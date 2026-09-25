"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const OPEN_SEARCH_EVENT = "sahih:open-search";

export function openSearch(query = "") {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: { query } }));
}

export function SearchButton({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("Nav");
  if (compact) {
    return (
      <Button variant="ghost" size="icon" aria-label={t("search")} onClick={() => openSearch()}>
        <Search className="size-5" />
      </Button>
    );
  }
  return (
    <Button variant="outline" className="h-9 min-w-56 justify-between gap-3 text-muted-foreground" onClick={() => openSearch()}>
      <span className="flex items-center gap-2">
        <Search className="size-4" />
        {t("searchPlaceholder")}
      </span>
      <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]" dir="ltr">⌘K</kbd>
    </Button>
  );
}
