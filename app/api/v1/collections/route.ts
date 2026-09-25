import { json, options } from "@/lib/api";
import { COLLECTIONS } from "@/lib/collections";
import { getCollections } from "@/lib/data/server";

export function GET() {
  return json(
    getCollections().map((c) => ({
      slug: c.slug,
      name: COLLECTIONS[c.slug].name,
      compiler: COLLECTIONS[c.slug].compilerId,
      hadiths: c.count,
      graded: c.graded,
      withStandardReference: c.matched,
      withEnglish: c.translated,
      books: c.books.length,
      url: `/api/v1/collections/${c.slug}`,
    })),
  );
}

export { options as OPTIONS };
