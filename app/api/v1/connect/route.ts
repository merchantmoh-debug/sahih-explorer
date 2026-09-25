import { apiError, json, options, publicNarrator } from "@/lib/api";
import { connect } from "@/lib/data/connect";
import { summaries } from "@/lib/data/server";

export function GET(req: Request) {
  const url = new URL(req.url);
  const teacher = url.searchParams.get("teacher") ?? "";
  const student = url.searchParams.get("student") ?? "";
  const r = connect(teacher, student);
  if (!r) return apiError(404, "Unknown narrators");
  const ids = new Set(r.paths.flat());
  return json({
    teacher: publicNarrator(r.teacher),
    student: publicNarrator(r.student),
    direct: r.direct,
    reverse: r.reverse,
    paths: r.paths,
    deathGapYears: r.deathGap,
    generationGap: r.generationGap,
    narrators: Object.fromEntries(Object.entries(summaries(ids)).map(([id, s]) => [id, publicNarrator(s)])),
  });
}

export { options as OPTIONS };
