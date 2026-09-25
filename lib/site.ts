export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://sahih-explorer.vercel.app").replace(/\/$/, "");
export const REPO_URL = "https://github.com/merchantmoh-debug/sahih-explorer";

/** Link that opens a pre-filled data correction issue. */
export function correctionUrl(title: string, context: string): string {
  const params = new URLSearchParams({
    template: "data-correction.yml",
    title: `[Data] ${title}`,
    page: context,
  });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}

type Languages = NonNullable<NonNullable<import("next").Metadata["alternates"]>["languages"]>;

/** hreflang alternates for a path in every locale. Next's types do not list
 *  "ckb" (Central Kurdish), hence the cast. */
export function languageAlternates(path: string): Languages {
  return { en: `/en${path}`, ar: `/ar${path}`, ckb: `/ckb${path}`, "x-default": `/en${path}` } as unknown as Languages;
}

/** Canonical URL and hreflang alternates for a page, `path` without the locale. */
export function pageAlternates(locale: string, path: string) {
  return { canonical: `/${locale}${path}`, languages: languageAlternates(path) };
}
