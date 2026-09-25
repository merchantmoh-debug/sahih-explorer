"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const NAMES: Record<string, string> = { en: "English", ar: "العربية", ckb: "کوردی (سۆرانی)" };

export function LanguageSwitcher() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const go = (next: string) => {
    const query = search.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale: next });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("language")} title={t("language")}>
          <Languages className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(NAMES).map(([code, name]) => (
          <DropdownMenuItem key={code} onSelect={() => go(code)} aria-current={code === locale ? "true" : undefined} className={code === locale ? "font-semibold" : undefined}>
            <span lang={code}>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
