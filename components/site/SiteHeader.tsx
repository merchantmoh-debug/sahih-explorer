import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";
import { SearchButton } from "./SearchButton";
import { ThemeToggle } from "./ThemeToggle";
import { NAV_ITEMS } from "./nav";

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const c = await getTranslations("Common");
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <MobileNav />
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-gold/15 font-amiri text-lg text-gold">س</span>
          <span className="hidden sm:inline">{c("siteName")}</span>
        </Link>
        <nav aria-label={t("primary")} className="ms-4 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <div className="hidden lg:block">
            <SearchButton />
          </div>
          <div className="lg:hidden">
            <SearchButton compact />
          </div>
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
