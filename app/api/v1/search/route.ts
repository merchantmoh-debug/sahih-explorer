import { json, options, publicNarrator } from "@/lib/api";
import { isCollectionSlug } from "@/lib/data/server";
import { searchHadiths, searchNarrators } from "@/lib/data/search";

export function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 200);
  const type = url.searchParams.get("type") ?? "all";
  const collection = url.searchParams.get("collection") ?? "";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const out: Record<string, unknown> = { q };
  if (type === "all" || type === "narrators") out.narrators = searchNarrators(q, type === "all" ? 8 : limit).map(publicNarrator);
  if (type === "all" || type === "hadiths") {
    const r = searchHadiths(q, { collection: isCollectionSlug(collection) ? collection : undefined, limit, offset });
    out.hadiths = { reference: r.reference, total: r.total, results: r.hits.map((h) => ({ ...h, url: `/en/${h.key}` })) };
  }
  return json(out);
}

export { options as OPTIONS };
