import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, csvObjects, parseMoney, slugify, splitList } from "./csv";
import { isPrivateIp, checkImageUrl } from "./import-images";

test("CSV: quotes, commas, doubled quotes and line breaks inside a cell", () => {
  const rows = parseCsv('a,b,c\n"x, y","say ""hi""","line1\nline2"\n\n1,2,3\n');
  assert.deepEqual(rows, [["a", "b", "c"], ["x, y", 'say "hi"', "line1\nline2"], ["1", "2", "3"]]);
  assert.deepEqual(csvObjects("Short Description,Price\nHello,55")[0], { short_description: "Hello", price: "55" });
});
test("prices in European and English formats", () => {
  assert.equal(parseMoney("$1.550,00"), 1550); assert.equal(parseMoney("1,550.50"), 1550.5); assert.equal(parseMoney("$55"), 55); assert.equal(parseMoney("€ 1 200"), 1200);
  assert.equal(parseMoney("775,00"), 775); assert.equal(parseMoney("1.650"), 1650); assert.equal(parseMoney("12.5"), 12.5); assert.equal(parseMoney(""), null); assert.equal(parseMoney("free"), null);
});
test("slugs and lists", () => { assert.equal(slugify("Nile Cruise: 4 Days/3 Nights!"), "nile-cruise-4-days-3-nights"); assert.deepEqual(splitList("a | b|  |c\nd"), ["a", "b", "c", "d"]); });
test("photos: https only, from the named website only, never private networks", () => {
  assert.equal(isPrivateIp("127.0.0.1"), true); assert.equal(isPrivateIp("10.1.2.3"), true); assert.equal(isPrivateIp("192.168.0.9"), true); assert.equal(isPrivateIp("172.20.1.1"), true); assert.equal(isPrivateIp("169.254.169.254"), true); assert.equal(isPrivateIp("::1"), true); assert.equal(isPrivateIp("fd00::1"), true); assert.equal(isPrivateIp("93.184.216.34"), false); assert.equal(isPrivateIp("8.8.8.8"), false);
  const allowed = ["old-site.com"];
  assert.ok(checkImageUrl("https://old-site.com/wp-content/a.jpg", allowed)); assert.ok(checkImageUrl("https://www.old-site.com/a.jpg", allowed)); assert.ok(checkImageUrl("https://cdn.old-site.com/a.jpg", allowed));
  assert.equal(checkImageUrl("http://old-site.com/a.jpg", allowed), null); assert.equal(checkImageUrl("https://evil.com/a.jpg", allowed), null); assert.equal(checkImageUrl("https://old-site.com.evil.com/a.jpg", allowed), null); assert.equal(checkImageUrl("https://user:pw@old-site.com/a.jpg", allowed), null); assert.equal(checkImageUrl("https://old-site.com:8443/a.jpg", allowed), null);
});
