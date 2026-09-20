import test from "node:test";
import assert from "node:assert/strict";
import { parseGuideBody, parseInline } from "./guide-body";

test("parses headings, lists, tables, callouts and paragraphs", () => {
  const b = parseGuideBody("Intro line one\ncontinues.\n\n> **Key takeaways**\n> - one\n> - two\n\n## Big heading\n### Small\n- a\n- b\n\n1. first\n2. second\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n");
  assert.deepEqual(b.map((x) => x.t), ["p", "callout", "h2", "h3", "ul", "ol", "table"]);
  assert.equal((b[0] as { text: string }).text, "Intro line one continues.");
  const c = b[1] as { title: string; items: string[] }; assert.equal(c.title, "Key takeaways"); assert.deepEqual(c.items, ["one", "two"]);
  const t = b[6] as { head: string[]; rows: string[][] }; assert.deepEqual(t.head, ["A", "B"]); assert.equal(t.rows.length, 2);
});
test("inline bold and safe links", () => {
  const p = parseInline("See **this** and [tours](/tours) or [bad](javascript:alert(1)).");
  assert.ok(p.some((x) => x.k === "b" && x.text === "this")); assert.ok(p.some((x) => x.k === "a" && x.href === "/tours"));
  assert.ok(!p.some((x) => x.k === "a" && (x.href ?? "").startsWith("javascript")));
});
