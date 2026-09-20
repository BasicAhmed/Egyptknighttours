import test from "node:test";
import assert from "node:assert/strict";
import { parseGuides, normalizePhone } from "./guides-import";

// Fake names and numbers only.
const SAMPLE = `Test One
English
\u200F011 20000001\u200F

Test Two
Spanish
\u200F+20 109 000 0002\u200F
\u200F\u200F0106 000 0003\u200F


Test Three
French
\u200F+20 10 00000004\u200F
\u200F+20 10 00000005\u200F

Test Four Luxor
Italian
\u200F+44 7700 900123\u200F`;

test("parses blocks and keeps only the first number", () => {
  const g = parseGuides(SAMPLE);
  assert.equal(g.length, 4);
  assert.deepEqual(g.map((x) => x.name), ["Test One", "Test Two", "Test Three", "Test Four Luxor"]);
  assert.deepEqual(g.map((x) => x.languages), ["English", "Spanish", "French", "Italian"]);
  assert.deepEqual(g.map((x) => x.phone), ["+201120000001", "+201090000002", "+201000000004", "+447700900123"]);
});
test("phone normalisation", () => {
  assert.equal(normalizePhone("011 20000009"), "+201120000009");
  assert.equal(normalizePhone("+20 10 00000008"), "+201000000008");
  assert.equal(normalizePhone("0020 10 0000 0008"), "+201000000008");
  assert.equal(normalizePhone("201000000008"), "+201000000008");
  assert.equal(normalizePhone("abc"), "");
});
