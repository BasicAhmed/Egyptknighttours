import test from "node:test";
import assert from "node:assert/strict";
import { normalizePath, normalizeTarget, parseRedirectList, builtinLegacy } from "./legacy";
const dests = new Set(["cairo", "luxor", "aswan", "sharm-el-sheikh"]);

test("old addresses are cleaned up the same way every time", () => {
  assert.equal(normalizePath("https://Old-Site.com/Tours/My-Tour/?ref=x#top"), "/tours/my-tour");
  assert.equal(normalizePath("tour-destination/luxor/"), "/tour-destination/luxor");
  assert.equal(normalizePath("/a//b///c/"), "/a/b/c"); assert.equal(normalizePath("/"), "/");
  assert.equal(normalizePath("/../etc/passwd"), null); assert.equal(normalizePath("/has space"), null); assert.equal(normalizePath(""), null);
});
test("a redirect can only lead to a page on this site", () => {
  const hosts = ["egyptknight.com", "www.egyptknight.com"];
  assert.equal(normalizeTarget("/destinations/luxor", hosts), "/destinations/luxor");
  assert.equal(normalizeTarget("https://www.egyptknight.com/tours/x?a=1", hosts), "/tours/x?a=1");
  assert.equal(normalizeTarget("https://evil.example/phish", hosts), null); assert.equal(normalizeTarget("//evil.example", hosts), null); assert.equal(normalizeTarget("tours/x", hosts), null);
});
test("pasted lists accept spaces, commas, tabs and arrows", () => {
  const { rows, errors } = parseRedirectList("# comment\n/a /b\n/c,/d\n/e\t/f\n/g -> /h\n/i => /j\n\n/broken\n");
  assert.deepEqual(rows.map((r) => [r.from, r.to]), [["/a", "/b"], ["/c", "/d"], ["/e", "/f"], ["/g", "/h"], ["/i", "/j"]]); assert.equal(errors.length, 1);
});
test("built-in rules for common WordPress tour-site addresses", () => {
  assert.equal(builtinLegacy("/tour-destination/luxor", dests)?.to, "/destinations/luxor");
  assert.equal(builtinLegacy("/tour-destination/egypt", dests)?.to, "/tours");
  assert.equal(builtinLegacy("/tour-destination/marrakech", dests)?.to, "/tours");
  assert.equal(builtinLegacy("/tour-destination/sharm-el-sheikh", dests)?.to, "/destinations/sharm-el-sheikh");
  assert.equal(builtinLegacy("/tour-activities/cruises-sailing", dests)?.to, "/egypt-tours/nile-cruises-egypt");
  assert.equal(builtinLegacy("/tour-activities/desert-safari", dests)?.to, "/tours");
  assert.equal(builtinLegacy("/custom-pacakage", dests)?.to, "/plan-my-trip");
  assert.equal(builtinLegacy("/cart", dests)?.to, "/tours"); assert.equal(builtinLegacy("/tf-search-form", dests)?.to, "/tours");
  assert.equal(builtinLegacy("/fr", dests)?.to, "/"); assert.equal(builtinLegacy("/fr/tour-destination/cairo", dests)?.to, "/destinations/cairo");
  assert.equal(builtinLegacy("/tours/some-old-tour", dests), null); assert.equal(builtinLegacy("/blog/anything", dests), null);
  assert.equal(builtinLegacy("/tours/some-old-tour", dests) === null && builtinLegacy("/fr/tours/x", dests)?.to === "/tours/x", true);
});
