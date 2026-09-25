"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useDebounce } from "use-debounce";
import { X } from "lucide-react";
import { formatPlain } from "@/lib/l10n";

export interface Picked { id: string; label: string }

interface Hit { id: string; name: { en: string; ar: string }; deathAH: number | null }

/** Type-ahead narrator search backed by the API. */
export function NarratorPicker({ label, value, onChange }: { label: string; value: Picked | null; onChange: (v: Picked | null) => void }) {
  const t = useTranslations("Connect");
  const locale = useLocale();
  const id = useId();
  const [q, setQ] = useState("");
  const [debounced] = useDebounce(q.trim(), 200);
  const [found, setFound] = useState<{ q: string; hits: Hit[] } | null>(null);
  const [open, setOpen] = useState(false);
  const name = (h: Hit) => (locale === "en" ? h.name.en : h.name.ar || h.name.en);

  useEffect(() => {
    if (debounced.length < 2) return;
    const ctrl = new AbortController();
    fetch(`/api/v1/search?type=narrators&limit=8&q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { narrators: Hit[] }) => { setFound({ q: debounced, hits: d.narrators }); setOpen(true); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [debounced]);
  const hits = debounced.length >= 2 && found?.q === debounced ? found.hits : [];

  if (value) {
    return (
      <div className="space-y-1">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex h-11 items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3">
          <span className="truncate" dir="auto">{value.label}</span>
          <button type="button" onClick={() => onChange(null)} aria-label={t("clear")} className="rounded p-1 hover:bg-accent"><X className="size-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input
        id={id}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder={t("typeName")}
        dir="auto"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        className="h-11 w-full rounded-lg border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {open && hits.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {hits.map((h) => (
            <li key={h.id} role="option" aria-selected={false}>
              <button type="button" onClick={() => { onChange({ id: h.id, label: name(h) }); setOpen(false); setQ(""); }} className="w-full rounded-md px-3 py-2 text-start hover:bg-accent">
                <span className="block truncate" dir="auto">{name(h)}</span>
                {h.deathAH !== null && <span className="text-xs text-muted-foreground">{t("died", { year: formatPlain(h.deathAH, locale) })}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
