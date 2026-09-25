import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReference, queryTokens, stripArabicPrefix } from "../lib/search/query";

test("references resolve from English and Arabic collection names", () => {
  assert.deepEqual(parseReference("bukhari 1"), { collection: "bukhari", number: "1" });
  assert.deepEqual(parseReference("Sahih Muslim 1907a"), { collection: "muslim", number: "1907a" });
  assert.deepEqual(parseReference("abu dawud #2201"), { collection: "abudawud", number: "2201" });
  assert.deepEqual(parseReference("البخاري ٥٢"), { collection: "bukhari", number: "52" });
  assert.deepEqual(parseReference("سنن ابن ماجه 4227"), { collection: "ibnmajah", number: "4227" });
  assert.equal(parseReference("prayer 5"), null);
  assert.equal(parseReference("bukhari"), null);
});

test("query tokens fold Arabic spelling and attached particles", () => {
  assert.equal(stripArabicPrefix("بالنيات"), "نيات");
  assert.equal(stripArabicPrefix("وال"), "وال");
  assert.deepEqual(queryTokens("إنّما الأعمالُ بالنّيّات"), ["انما", "اعمال", "نيات"]);
  assert.deepEqual(queryTokens("Anas ibn Malik"), ["anas", "bin", "malik"]);
});
