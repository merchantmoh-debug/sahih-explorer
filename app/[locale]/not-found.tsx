import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-24 text-center">
      <p className="font-amiri text-4xl text-gold" lang="ar">٤٠٤</p>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <div className="flex justify-center gap-3">
        <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">{t("home")}</Link>
        <Link href="/search" className="rounded-lg border px-4 py-2 hover:bg-accent">{t("search")}</Link>
      </div>
    </div>
  );
}
