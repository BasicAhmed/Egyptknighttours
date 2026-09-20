import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const v3 = fs.readFileSync("src/db/content-v3.ts", "utf8");
const landing = fs.readFileSync("src/lib/landing.ts", "utf8");
const V3_SLUGS = [...v3.matchAll(/\{ slug: "([a-z0-9-]+)", title:/g)].map((m) => m[1]);
const KEPT = ["egypt-visa-guide", "egypt-3-day-itinerary", "egypt-currency-money-and-tipping", "is-egypt-safe-for-tourists", "egypt-dress-code-and-etiquette", "nile-cruise-guide-luxor-aswan"];
const GUIDE_SLUGS = new Set([...V3_SLUGS, ...KEPT]);
const LANDING_SLUGS = new Set([...landing.matchAll(/slug: "([a-z0-9-]+)", eyebrow/g)].map((m) => m[1]));
const STATIC = new Set(["/tours", "/plan-my-trip", "/track", "/contact", "/faq", "/egypt-travel-guide", "/destinations"]);
const DESTS = new Set(["cairo", "giza", "luxor", "aswan", "alexandria", "hurghada"]);

test("the ten requested guides exist", () => {
  for (const s of ["egypt-travel-guide-2026", "how-much-does-a-trip-to-egypt-cost", "best-places-to-visit-in-egypt", "best-time-to-visit-egypt", "egypt-7-day-itinerary", "cairo-travel-guide", "egypt-pyramids-guide", "cairo-vs-luxor-vs-aswan", "egypt-travel-tips-first-time-visitors", "egypt-tour-packages-explained"]) assert.ok(V3_SLUGS.includes(s), `missing ${s}`);
});
test("every internal link points to a page that exists", () => {
  const links = [...v3.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]); assert.ok(links.length > 60);
  for (const l of links) {
    if (STATIC.has(l)) continue;
    let m: RegExpExecArray | null;
    if ((m = /^\/egypt-travel-guide\/([a-z0-9-]+)$/.exec(l))) { assert.ok(GUIDE_SLUGS.has(m[1]), `broken guide link ${l}`); continue; }
    if ((m = /^\/destinations\/([a-z]+)$/.exec(l))) { assert.ok(DESTS.has(m[1]), `broken destination link ${l}`); continue; }
    if ((m = /^\/egypt-tours\/([a-z0-9-]+)$/.exec(l))) { assert.ok(LANDING_SLUGS.has(m[1]), `broken landing link ${l}`); continue; }
    assert.fail(`unknown link target ${l}`);
  }
});
test("related lists only name real guides, and every guide has related reading", () => {
  for (const m of v3.matchAll(/related: "([^"]*)"/g)) { const list = m[1].split(",").filter(Boolean); assert.ok(list.length >= 2, "needs at least 2 related guides"); for (const s of list) assert.ok(GUIDE_SLUGS.has(s), `related slug not found: ${s}`); }
});
test("SEO titles and descriptions fit, and the ten main guides are substantial", () => {
  for (const m of v3.matchAll(/seoTitle: "([^"]+)", seoDescription: "([^"]+)"/g)) { assert.ok(m[1].length <= 70, `title too long (${m[1].length}): ${m[1]}`); assert.ok(m[2].length <= 165, `description too long (${m[2].length}): ${m[2].slice(0, 40)}`); }
  const blocks = v3.split(/\n\{ slug: "/).slice(1);
  for (const b of blocks) { const slug = b.slice(0, b.indexOf('"')); const words = b.slice(b.indexOf("body: `")).split(/\s+/).length; if (["egypt-travel-guide-2026", "how-much-does-a-trip-to-egypt-cost", "best-places-to-visit-in-egypt", "best-time-to-visit-egypt", "egypt-7-day-itinerary", "cairo-travel-guide", "egypt-pyramids-guide", "cairo-vs-luxor-vs-aswan", "egypt-travel-tips-first-time-visitors", "egypt-tour-packages-explained"].includes(slug)) assert.ok(words >= 420, `${slug} is only ${words} words`); }
});
