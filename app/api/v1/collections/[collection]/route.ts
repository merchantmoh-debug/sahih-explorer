import { apiError, json, options } from "@/lib/api";
import { COLLECTIONS } from "@/lib/collections";
import { getCollection, isCollectionSlug } from "@/lib/data/server";

export async function GET(_req: Request, { params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  if (!isCollectionSlug(collection)) return apiError(404, "Unknown collection");
  const c = getCollection(collection)!;
  return json({
    slug: c.slug,
    name: COLLECTIONS[c.slug].name,
    hadiths: c.count,
    books: c.books.map((b) => ({ ...b, url: `/api/v1/collections/${c.slug}/books/${b.n}` })),
  });
}

export { options as OPTIONS };
