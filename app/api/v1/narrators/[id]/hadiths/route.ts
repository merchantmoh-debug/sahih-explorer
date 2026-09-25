import { apiError, json, options, publicHadithSummary } from "@/lib/api";
import { getHadiths, getNarrator, isCollectionSlug } from "@/lib/data/server";

const PAGE_SIZE = 10;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = getNarrator(id);
  if (!n) return apiError(404, "Unknown narrator");
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const collection = url.searchParams.get("collection") ?? "";
  const keys = collection && isCollectionSlug(collection) ? n.hadiths.filter((k) => k.startsWith(`${collection}/`)) : n.hadiths;
  const slice = keys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return json({
    narrator: id,
    page,
    pageSize: PAGE_SIZE,
    total: keys.length,
    hadiths: getHadiths(slice).map(publicHadithSummary),
  });
}

export { options as OPTIONS };
