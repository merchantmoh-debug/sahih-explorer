// "Did A narrate from B?": direct links and shortest teacher → student paths.
import "server-only";
import { getAdjacency, getNarratorSummary } from "./server";
import type { NarratorSummary } from "./types";

export interface LinkInfo { from: string; to: string; n: number; listed: boolean }

export interface ConnectResult {
  teacher: NarratorSummary;
  student: NarratorSummary;
  /** teacher → student recorded directly. */
  direct: LinkInfo | null;
  /** student → teacher recorded instead (the reverse direction). */
  reverse: LinkInfo | null;
  /** Shortest chains of transmission from teacher to student (IDs, teacher first). */
  paths: string[][];
  /** Years between their deaths (student − teacher), when both are known. */
  deathGap: number | null;
  generationGap: number | null;
}

const MAX_DEPTH = 6;
const MAX_PATHS = 5;

function linkBetween(from: string, to: string): LinkInfo | null {
  const l = getAdjacency().students.get(from)?.find((x) => x.id === to);
  return l ? { from, to, n: l.n, listed: l.listed } : null;
}

/** Shortest paths following teacher → student links, strongest links first. */
function shortestPaths(from: string, to: string): string[][] {
  const { students } = getAdjacency();
  const depth = new Map<string, number>([[from, 0]]);
  const parents = new Map<string, string[]>();
  let frontier = [from];
  for (let d = 1; d <= MAX_DEPTH && frontier.length && !depth.has(to); d++) {
    const next: string[] = [];
    for (const node of frontier) {
      const out = [...(students.get(node) ?? [])].sort((a, b) => b.n - a.n);
      for (const { id } of out) {
        if (!depth.has(id)) {
          depth.set(id, d);
          next.push(id);
        }
        if (depth.get(id) === d) {
          const p = parents.get(id) ?? [];
          if (!p.includes(node)) p.push(node);
          parents.set(id, p);
        }
      }
    }
    frontier = next;
    if (frontier.length > 20000) break;
  }
  if (!depth.has(to)) return [];
  const paths: string[][] = [];
  const walk = (node: string, acc: string[]) => {
    if (paths.length >= MAX_PATHS) return;
    if (node === from) { paths.push([from, ...acc]); return; }
    for (const p of parents.get(node) ?? []) walk(p, [node, ...acc]);
  };
  walk(to, []);
  return paths;
}

export function connect(teacherId: string, studentId: string): ConnectResult | null {
  const teacher = getNarratorSummary(teacherId);
  const student = getNarratorSummary(studentId);
  if (!teacher || !student || teacherId === studentId) return null;
  const direct = linkBetween(teacherId, studentId);
  const reverse = linkBetween(studentId, teacherId);
  return {
    teacher,
    student,
    direct,
    reverse,
    paths: direct ? [[teacherId, studentId]] : shortestPaths(teacherId, studentId),
    deathGap: teacher.d !== null && student.d !== null ? student.d - teacher.d : null,
    generationGap: teacher.gen !== null && student.gen !== null ? student.gen - teacher.gen : null,
  };
}
