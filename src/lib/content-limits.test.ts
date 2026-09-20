import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// The admin forms reject titles over 70 and descriptions over 170 characters, so seeded content must fit.
test("seeded SEO titles and descriptions fit the admin limits", () => {
  const s = fs.readFileSync("src/db/content-v2.ts", "utf8");
  for (const m of s.matchAll(/seo(Title|Description): "([^"]+)"/g)) assert.ok(m[2].length <= (m[1] === "Title" ? 70 : 165), `${m[1]} too long: ${m[2].slice(0, 50)}`);
  for (const m of s.matchAll(/\]: \["([^"]+)", "([^"]+)"\]|"[a-z0-9-]+": \["([^"]+)", "([^"]+)"\]/g)) { const t = m[1] ?? m[3], d = m[2] ?? m[4]; assert.ok(t.length <= 70 && d.length <= 168); }
});
