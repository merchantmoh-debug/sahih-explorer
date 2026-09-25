import { test } from "node:test";
import assert from "node:assert/strict";
import { alignChain, isFollowUpText, type NameIndex } from "../../scripts/data/lib/align";
import { buildGraph, PROPHET_ID } from "../../scripts/data/lib/graph";
import { nameTokenSet, nameUnits } from "../../scripts/data/lib/names";

interface Person { id: string; ar: string; companion?: boolean; parents?: string[]; teachers?: string[] }

const COMMON = new Set(["محمد", "عبدالله", "عبدالرحمن"]);

function index(people: Person[]): NameIndex {
  const units = new Map(people.map((p) => [p.id, nameTokenSet(p.ar)]));
  const known = new Set(people.flatMap((p) => [...nameTokenSet(p.ar)]));
  return {
    units: (id) => units.get(id),
    idf: (u) => (COMMON.has(u) ? 1.5 : 5),
    known: (u) => known.has(u),
    parents: (id) => new Set(people.find((p) => p.id === id)?.parents ?? []),
    teachers: (id) => people.find((p) => p.id === id)?.teachers ?? [],
    isCompanion: (id) => Boolean(people.find((p) => p.id === id)?.companion),
    firstUnits: new Set(people.map((p) => nameUnits(p.ar)[0]).filter(Boolean)),
  };
}

const graphOf = (chain: string[], idx: NameIndex, text: string, attested: (t: string, s: string) => boolean = () => false) => {
  const alignment = alignChain(text, chain, idx);
  const full = [...chain, ...alignment.extended];
  const graph = buildGraph({ chain: full, compilerId: "C", alignment, marfu: alignment.prophet !== null, attested, isCompanion: idx.isCompanion });
  return { alignment, graph, edges: graph.edges.map(([a, b]) => `${a}>${b}`).sort(), gaps: graph.gaps.map(([a, b]) => `${a}>${b}`).sort() };
};

test("aligns Sahih al-Bukhari 1: every narrator, the transmission words and the Prophet ﷺ", () => {
  const people: Person[] = [
    { id: "100", ar: "عبد الله بن الزبير بن عيسى الحميدي" },
    { id: "101", ar: "سفيان بن عيينة" },
    { id: "102", ar: "يحيى بن سعيد الأنصاري" },
    { id: "103", ar: "محمد بن إبراهيم بن الحارث التيمي" },
    { id: "104", ar: "علقمة بن وقاص الليثي" },
    { id: "105", ar: "عمر بن الخطاب", companion: true },
  ];
  const text = "حدثنا الحميدي عبد الله بن الزبير، قال حدثنا سفيان، قال حدثنا يحيى بن سعيد الأنصاري، قال أخبرني محمد بن إبراهيم التيمي، أنه سمع علقمة بن وقاص الليثي، يقول سمعت عمر بن الخطاب ـ رضى الله عنه ـ على المنبر قال سمعت رسول الله صلى الله عليه وسلم يقول ‏\"‏ إنما الأعمال بالنيات";
  const { alignment, edges, gaps } = graphOf(people.map((p) => p.id), index(people), text);
  assert.deepEqual(alignment.matched, [true, true, true, true, true, true]);
  assert.deepEqual(alignment.termBefore, ["haddathana", "haddathana", "haddathana", "akhbarani", "samitu", "samitu"]);
  assert.ok(alignment.prophet);
  assert.equal(alignment.prophetTerm, "samitu");
  assert.ok(text.slice(alignment.matnStart!).startsWith("إنما الأعمال"));
  assert.deepEqual(edges, ["1>105", "100>C", "101>100", "102>101", "103>102", "104>103", "105>104"].sort());
  assert.deepEqual(gaps, []);
});

test("narrators cited together are parallel students of the shared teacher", () => {
  const people: Person[] = [
    { id: "200", ar: "محمد بن عبيد الغبري" },
    { id: "201", ar: "فضيل بن حسين بن طلحة" },
    { id: "202", ar: "حماد بن زيد" },
    { id: "203", ar: "مطر بن طهمان الوراق" },
    { id: "204", ar: "عبد الله بن بريدة الأسلمي" },
  ];
  const text = "حدثني محمد بن عبيد الغبري، وأبو كامل الجحدري وأحمد بن عبدة قالوا حدثنا حماد بن زيد، عن مطر الوراق، عن عبد الله بن بريدة، عن يحيى";
  const { alignment, edges } = graphOf(people.map((p) => p.id), index(people), text);
  assert.deepEqual(alignment.coGroups, [[0, 1]]);
  assert.ok(edges.includes("202>200") && edges.includes("202>201"));
  assert.ok(edges.includes("200>C") && edges.includes("201>C"));
  assert.ok(!edges.includes("201>200"), "co-narrators are not teacher and student");
});

test("a switch (ح) makes two branches that meet at the shared teacher", () => {
  const people: Person[] = [
    { id: "300", ar: "عبيد الله بن معاذ العنبري", parents: ["301"] },
    { id: "301", ar: "معاذ بن معاذ العنبري" },
    { id: "302", ar: "محمد بن المثنى" },
    { id: "303", ar: "عبد الرحمن بن مهدي" },
    { id: "304", ar: "شعبة بن الحجاج" },
    { id: "305", ar: "خبيب بن عبد الرحمن" },
    { id: "306", ar: "حفص بن عاصم بن عمر" },
  ];
  const text = "وحدثنا عبيد الله بن معاذ العنبري، حدثنا أبي، ح وحدثنا محمد بن المثنى، حدثنا عبد الرحمن بن مهدي، قالا حدثنا شعبة، عن خبيب بن عبد الرحمن، عن حفص بن عاصم، قال قال رسول الله صلى الله عليه وسلم كفى بالمرء كذبا";
  const attested = (t: string, s: string) => t === "304" && s === "301";
  const { alignment, graph, edges, gaps } = graphOf(people.map((p) => p.id), index(people), text, attested);
  assert.deepEqual(alignment.switches, [1]);
  assert.equal(graph.branched, true);
  for (const e of ["301>300", "300>C", "302>C", "303>302", "304>303", "304>301", "305>304", "306>305"]) assert.ok(edges.includes(e), e);
  assert.ok(!edges.includes("302>301"), "no link across the switch");
  // Hafs is a Successor: his report reaching the Prophet ﷺ is not direct.
  assert.deepEqual(gaps, [`${PROPHET_ID}>306`]);
});

test("a name in the text that the chain leaves out becomes a gap, a kunya is matched by position", () => {
  const people: Person[] = [
    { id: "400", ar: "سليمان بن حرب" },
    { id: "401", ar: "حماد بن زيد" },
    { id: "402", ar: "أيوب بن أبي تميمة السختياني" },
    { id: "403", ar: "عبد الله بن زيد الجرمي" },
    { id: "404", ar: "أنس بن مالك", companion: true },
    { id: "405", ar: "سماك بن عطية" },
  ];
  const text = "حدثنا سليمان بن حرب، قال حدثنا حماد بن زيد، عن سماك بن عطية، عن أيوب، عن أبي قلابة، عن أنس، قال أمر بلال أن يشفع الأذان";
  const { alignment, edges, gaps } = graphOf(["400", "401", "402", "403", "404"], index(people), text);
  assert.equal(alignment.matched[3], true, "Abu Qilaba matched by position");
  assert.deepEqual(gaps, ["402>401"]);
  assert.ok(edges.includes("403>402") && edges.includes("404>403"));
  assert.deepEqual([...alignment.hiddenNames.values()].flat(), ["سماك بن عطية"]);
});

test("a chain that stops short is extended only by an unambiguous known teacher", () => {
  const people: Person[] = [
    { id: "500", ar: "عبد الله بن يوسف" },
    { id: "501", ar: "ذكوان أبو صالح السمان", teachers: ["502", "503"] },
    { id: "502", ar: "أبو سعيد سعد بن مالك بن سنان الخدري", companion: true },
    { id: "503", ar: "أبو هريرة عبد الرحمن بن صخر", companion: true },
  ];
  const text = "حدثنا عبد الله بن يوسف، عن ذكوان يحدث عن أبي سعيد الخدري، قالت النساء للنبي صلى الله عليه وسلم غلبنا عليك الرجال";
  const { alignment, edges } = graphOf(["500", "501"], index(people), text);
  assert.deepEqual(alignment.extended, ["502"]);
  assert.ok(edges.includes("502>501") && edges.includes(`${PROPHET_ID}>502`));
});

test("follow-up chains are recognised by their closing words", () => {
  assert.equal(isFollowUpText("بهذا الإسناد مثله"), true);
  assert.equal(isFollowUpText("نحوه"), true);
  assert.equal(isFollowUpText("إنما الأعمال بالنيات وإنما لكل امرئ ما نوى"), false);
});
