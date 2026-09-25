import { apiError, json, options, publicHadith } from "@/lib/api";
import { getHadith, isCollectionSlug } from "@/lib/data/server";

export async function GET(_req: Request, { params }: { params: Promise<{ collection: string; number: string }> }) {
  const { collection, number } = await params;
  if (!isCollectionSlug(collection)) return apiError(404, "Unknown collection");
  const h = getHadith(collection, decodeURIComponent(number));
  if (!h) return apiError(404, "Unknown hadith");
  return json(publicHadith(h));
}

export { options as OPTIONS };
