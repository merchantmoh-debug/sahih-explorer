import { getTranslations } from "next-intl/server";
import type { GraphLabels } from "@/components/graph/TransmissionGraph";
import { formatPlain } from "@/lib/l10n";

export async function graphLabels(locale: string): Promise<GraphLabels> {
  const t = await getTranslations({ locale, namespace: "Graph" });
  return {
    died: (year) => t("died", { year: formatPlain(year, locale) }),
    generation: (n) => t("generation", { n: formatPlain(n, locale) }),
    compiler: t("compiler"),
    unidentified: t("unidentified"),
    gap: t("gap"),
  };
}
