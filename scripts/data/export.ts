/**
 * Exports the built dataset for download (attached to GitHub releases):
 *   dist/dataset/narrators.jsonl   one narrator per line
 *   dist/dataset/hadiths.jsonl     one hadith per line, with its chain graph
 *   dist/dataset/edges.csv         teacher_id,student_id,chains,listed
 *   dist/dataset/meta.json         build metadata and integrity checks
 *   dist/dataset/README.md         what each file holds and where it comes from
 *
 * Usage: npm run data:build && npm run data:export
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { COLLECTION_SLUGS } from "../../lib/collections";
import type { BuildMeta, CollectionSummary, EdgeRow, HadithRecord, NarratorRecord } from "../../lib/data/types";

const ROOT = process.cwd();
const BUILD = path.join(ROOT, "data", "build");
const OUT = path.join(ROOT, "dist", "dataset");

const read = <T,>(rel: string): T => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(BUILD, `${rel}.json.gz`))).toString("utf8")) as T;

function main() {
  if (!fs.existsSync(path.join(BUILD, "meta.json.gz"))) {
    console.error("Run `npm run data:build` first.");
    process.exit(1);
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const narrators = fs.createWriteStream(path.join(OUT, "narrators.jsonl"));
  let nCount = 0;
  for (let i = 0; i < 64; i++) {
    const shard = read<Record<string, NarratorRecord>>(`narrators/${i}`);
    for (const r of Object.values(shard)) { narrators.write(`${JSON.stringify(r)}\n`); nCount++; }
  }
  narrators.end();

  const hadiths = fs.createWriteStream(path.join(OUT, "hadiths.jsonl"));
  let hCount = 0;
  const collections = read<CollectionSummary[]>("collections");
  for (const c of COLLECTION_SLUGS) {
    const summary = collections.find((x) => x.slug === c)!;
    for (const b of summary.books) {
      for (const h of read<{ hadiths: HadithRecord[] }>(`hadiths/${c}/${b.n}`).hadiths) { hadiths.write(`${JSON.stringify(h)}\n`); hCount++; }
    }
  }
  hadiths.end();

  const edges = read<EdgeRow[]>("graph/edges");
  fs.writeFileSync(path.join(OUT, "edges.csv"), ["teacher_id,student_id,chains,listed", ...edges.map((e) => e.join(","))].join("\n") + "\n");

  const meta = read<BuildMeta>("meta");
  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(OUT, "README.md"), `# Sahih Explorer dataset

Built ${meta.builtAt} from source ${meta.sourceHash}.

- narrators.jsonl: ${nCount} narrators (fields: see lib/data/types.ts, NarratorRecord)
- hadiths.jsonl: ${hCount} hadith records with Arabic/English text, references,
  gradings, narrator mentions in the text, chain graph and notes (HadithRecord)
- edges.csv: ${edges.length} teacher → student links with the number of chains
  using each and whether the source lists it
- meta.json: counts and the integrity checks the build passed

Sources:
- Narrator records and chains: the Hadith Narrators Dataset and the Hadith
  Dataset published on Kaggle by fahd09 (hadith text scraped from
  qaalarasulallah.com).
- Standard references, published gradings and some English translations: the
  Hadith API (github.com/fawazahmed0/hadith-api, public domain), matched by
  Arabic text.

Chain graphs, notes and groupings are derived by this project's build and are
study aids, not gradings. DATA.md in the repository describes each source, its
terms, the build and its known limitations:
https://github.com/merchantmoh-debug/sahih-explorer/blob/main/DATA.md
`);
  console.log(`exported ${nCount} narrators, ${hCount} hadith, ${edges.length} edges → ${path.relative(ROOT, OUT)}`);
}

main();
