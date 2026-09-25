#!/usr/bin/env node
/**
 * Smoke test against a running server: key pages and API routes answer with
 * the expected status, carry the expected content, and stay within size
 * budgets (a page that starts embedding a whole index fails here first).
 *
 * Usage: node scripts/smoke.mjs [base-url]   (default http://localhost:3000)
 */
const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const KB = 1024;
const PAGE_BUDGET = 700 * KB;

/** [path, status, checks] */
const CASES = [
  ["/en", 200, { text: ["Sahih Explorer", 'hreflang="ar"'], max: PAGE_BUDGET }],
  ["/ar", 200, { text: ['dir="rtl"', 'lang="ar"'], max: PAGE_BUDGET }],
  ["/ckb", 200, { text: ['dir="rtl"', 'lang="ckb"'], max: PAGE_BUDGET }],
  ["/en/collections", 200, { text: ["Sunan Ibn Majah"] }],
  ["/en/bukhari", 200, { text: ["Revelation"] }],
  ["/en/bukhari/book/1", 200, { text: ["Sahih al-Bukhari 1"] }],
  ["/en/bukhari/1", 200, { text: ["Sahih al-Bukhari 1", "<svg", 'rel="canonical"'], max: PAGE_BUDGET }],
  ["/ar/muslim/1907a", 200, { text: ["1907a"], max: PAGE_BUDGET }],
  ["/en/scholar/13", 200, { text: ["Abu Hurairah"], max: PAGE_BUDGET }],
  ["/en/scholar/30001", 200, { text: ["al-Bukhari"], max: PAGE_BUDGET }],
  ["/en/scholar/1", 200, { text: ["Prophet Muhammad"], max: PAGE_BUDGET }],
  ["/en/search?q=intentions", 200, { text: ["Sahih al-Bukhari"] }],
  ["/en/search?q=bukhari%201", [307, 308], { location: "/en/bukhari/1" }],
  ["/en/connect?student=20001&teacher=11014", 200, { text: ["Maalik"] }],
  ["/en/glossary", 200, { text: ["Trustworthy", "ثقة", "حدثنا"] }],
  ["/en/about", 200, { text: ["DATA.md"] }],
  ["/en/developers", 200, { text: ["/api/v1"] }],
  ["/en/hadith/sahih-bukhari-1", 308, { location: "/en/bukhari/1" }],
  ["/data/scholars/13.json", 308, { location: "/api/v1/narrators/13" }],
  ["/en/scholar/99999999", 404, {}],
  ["/en/bukhari/999999", 404, {}],
  ["/en/no-such-collection", 404, {}],
  ["/robots.txt", 200, { text: ["Sitemap:", "/sitemap/0.xml"] }],
  ["/sitemap/0.xml", 200, { text: ["<urlset", "/ckb/collections"] }],
  ["/en/bukhari/1/opengraph-image", 200, { type: "image/png" }],
  ["/api/v1", 200, { json: (d) => typeof d === "object" && d !== null }],
  ["/api/v1/meta", 200, { json: (d) => d.validation.checks.every((c) => c.ok) && d.counts.hadiths > 34000 }],
  ["/api/v1/collections", 200, { json: (d) => (d.collections ?? d).length === 6 }],
  ["/api/v1/hadiths/bukhari/1", 200, { json: (d) => d.chain.edges.length > 0 && d.reference.standard === "1" }],
  ["/api/v1/hadiths/bukhari/999999", 404, {}],
  ["/api/v1/narrators/13", 200, { json: (d) => d.id === "13" || d.narrator?.id === "13" }],
  ["/api/v1/narrators/13/hadiths?page=1", 200, { json: (d) => Array.isArray(d.hadiths) && d.hadiths.length > 0 }],
  ["/api/v1/search?q=abu%20hurairah&type=narrators", 200, { json: (d) => d.narrators.some((n) => n.id === "13") }],
  ["/api/v1/search?q=muslim%201907a&type=hadiths", 200, { json: (d) => d.hadiths.reference === "muslim/1907a" }],
  ["/api/v1/connect?student=20001&teacher=11014", 200, { json: (d) => d.direct?.n > 0 }],
  ["/api/v1/connect?student=20005&teacher=13", 200, { json: (d) => d.direct === null && d.paths.length > 0 }],
];

async function run([path, status, checks]) {
  const res = await fetch(BASE + path, { redirect: "manual", headers: { "accept-language": "en" } });
  const problems = [];
  const expected = Array.isArray(status) ? status : [status];
  if (!expected.includes(res.status)) problems.push(`status ${res.status}, expected ${expected.join(" or ")}`);
  if (checks.location) {
    const loc = res.headers.get("location") ?? "";
    if (!loc.endsWith(checks.location)) problems.push(`location "${loc}", expected "${checks.location}"`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (checks.max && buf.length > checks.max) problems.push(`${Math.round(buf.length / KB)} KB, budget ${Math.round(checks.max / KB)} KB`);
  if (checks.type && !(res.headers.get("content-type") ?? "").startsWith(checks.type)) problems.push(`content-type ${res.headers.get("content-type")}`);
  if (checks.text) {
    // Case-insensitive: React writes some attributes in camelCase (hrefLang).
    const body = buf.toString("utf8").toLowerCase();
    for (const t of checks.text) if (!body.includes(t.toLowerCase())) problems.push(`missing "${t}"`);
  }
  if (checks.json) {
    try {
      if (!checks.json(JSON.parse(buf.toString("utf8")))) problems.push("JSON check failed");
    } catch (e) {
      problems.push(`JSON: ${e.message}`);
    }
  }
  return { path, status: res.status, size: buf.length, problems };
}

const results = [];
for (const c of CASES) {
  try {
    results.push(await run(c));
  } catch (e) {
    results.push({ path: c[0], status: 0, size: 0, problems: [e.message] });
  }
}
let failed = 0;
for (const r of results) {
  const ok = r.problems.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${String(r.status).padEnd(4)} ${String(Math.round(r.size / KB)).padStart(5)} KB  ${r.path}${ok ? "" : `\n       ${r.problems.join("\n       ")}`}`);
}
console.log(`\n${results.length - failed}/${results.length} passed against ${BASE}`);
process.exit(failed ? 1 : 0);
