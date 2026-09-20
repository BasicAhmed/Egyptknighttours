import test from "node:test";
import assert from "node:assert/strict";
import { jsonLd } from "./jsonld";
import { revive } from "./cache";
import { normalizePhone } from "./guides-import";

test("JSON-LD can never close its own script tag", () => {
  const out = jsonLd({ name: "</script><script>alert(1)</script>", ok: true });
  assert.ok(!out.includes("</script>")); assert.ok(!out.includes("<")); assert.equal(JSON.parse(out).name, "</script><script>alert(1)</script>");
});
test("cached data gets its dates back", () => {
  const r = revive({ id: "x", createdAt: "2026-09-20T12:00:00.000Z", nested: [{ at: "2026-01-02T03:04:05Z" }], label: "2026-09-20" }) as unknown as { createdAt: unknown; nested: { at: unknown }[]; label: string; id: string };
  assert.ok(r.createdAt instanceof Date); assert.ok(r.nested[0].at instanceof Date); assert.equal(r.label, "2026-09-20"); assert.equal(r.id, "x");
});
test("phone numbers keep their meaning", () => { assert.equal(normalizePhone("0100 000 0000"), "+201000000000"); });
