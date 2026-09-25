import { notFound, permanentRedirect } from "next/navigation";
import { resolveLegacyHadith } from "@/lib/data/server";

// Old URLs (/en/hadith/sahih-bukhari-1) point to the new readable ones.
export default async function LegacyHadithRedirect({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const key = resolveLegacyHadith(decodeURIComponent(id));
  if (!key) notFound();
  permanentRedirect(`/${locale}/${key}`);
}
