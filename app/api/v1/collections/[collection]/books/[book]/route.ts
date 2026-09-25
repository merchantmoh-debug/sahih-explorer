import { apiError, json, options, publicHadithSummary } from "@/lib/api";
import { getBook, isCollectionSlug } from "@/lib/data/server";

export async function GET(_req: Request, { params }: { params: Promise<{ collection: string; book: string }> }) {
  const { collection, book } = await params;
  if (!isCollectionSlug(collection) || !/^\d+$/.test(book)) return apiError(404, "Not found");
  const data = getBook(collection, Number(book));
  if (!data) return apiError(404, "Unknown book");
  return json({ book: data.book, hadiths: data.hadiths.map(publicHadithSummary) });
}

export { options as OPTIONS };
