import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function Pager({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  const t = useTranslations("Common");
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-4 text-sm" aria-label={t("pagination")}>
      {page > 1 ? <Link href={hrefFor(page - 1)} className="rounded-md border px-3 py-1.5 hover:bg-accent">{t("previous")}</Link> : <span />}
      <span className="text-muted-foreground">{t("pageOf", { page, pages })}</span>
      {page < pages ? <Link href={hrefFor(page + 1)} className="rounded-md border px-3 py-1.5 hover:bg-accent">{t("next")}</Link> : <span />}
    </nav>
  );
}
