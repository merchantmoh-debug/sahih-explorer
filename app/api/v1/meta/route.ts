import { json } from "@/lib/api";
import { getMeta } from "@/lib/data/server";

export function GET() {
  return json(getMeta());
}
