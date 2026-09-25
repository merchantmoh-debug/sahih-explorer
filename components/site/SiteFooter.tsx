import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { REPO_URL } from "@/lib/site";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm md:grid-cols-3">
        <div className="space-y-2">
          <p className="font-semibold">{t("title")}</p>
          <p className="text-muted-foreground">{t("tagline")}</p>
        </div>
        <nav aria-label={t("links")} className="grid grid-cols-2 gap-2">
          <Link href="/collections" className="hover:underline">{nav("collections")}</Link>
          <Link href="/connect" className="hover:underline">{nav("connect")}</Link>
          <Link href="/glossary" className="hover:underline">{nav("glossary")}</Link>
          <Link href="/about" className="hover:underline">{nav("about")}</Link>
          <Link href="/developers" className="hover:underline">{nav("developers")}</Link>
          <a href={`${REPO_URL}/issues/new/choose`} className="hover:underline" rel="noopener">{t("reportIssue")}</a>
        </nav>
        <p className="text-muted-foreground">{t("disclaimer")}</p>
      </div>
    </footer>
  );
}
