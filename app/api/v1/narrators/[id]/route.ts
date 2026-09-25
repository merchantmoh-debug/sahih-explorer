import { apiError, json, options, publicNarratorRecord } from "@/lib/api";
import { getNarrator } from "@/lib/data/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = getNarrator(id);
  if (!n) return apiError(404, "Unknown narrator");
  return json(publicNarratorRecord(n));
}

export { options as OPTIONS };
