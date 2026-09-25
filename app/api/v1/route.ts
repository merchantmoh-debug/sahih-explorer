import { json } from "@/lib/api";
import { getMeta } from "@/lib/data/server";

export function GET() {
  const meta = getMeta();
  return json({
    name: "Sahih Explorer API",
    version: "v1",
    documentation: "/en/developers",
    data: { builtAt: meta.builtAt, sourceHash: meta.sourceHash, counts: meta.counts },
    endpoints: {
      collections: "/api/v1/collections",
      collection: "/api/v1/collections/{collection}",
      book: "/api/v1/collections/{collection}/books/{book}",
      hadith: "/api/v1/hadiths/{collection}/{number}",
      narrator: "/api/v1/narrators/{id}",
      narratorHadiths: "/api/v1/narrators/{id}/hadiths?page=1&collection=",
      search: "/api/v1/search?q=&type=all|narrators|hadiths&collection=&limit=&offset=",
      connect: "/api/v1/connect?teacher={id}&student={id}",
      meta: "/api/v1/meta",
    },
  });
}
