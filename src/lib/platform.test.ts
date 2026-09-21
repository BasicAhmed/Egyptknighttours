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

import fs from "node:fs";
test("the Nino Techy credit is not an admin setting", () => {
  assert.ok(!/builder\./.test(fs.readFileSync("src/app/admin/settings/page.tsx", "utf8")), "settings page must not expose the credit");
  assert.ok(!/builder\./.test(fs.readFileSync("src/lib/settings.ts", "utf8")), "settings defaults must not include the credit");
  assert.ok(/BUILDER_NAME = "Nino Techy"/.test(fs.readFileSync("src/lib/builder.ts", "utf8"))); assert.ok(/BUILDER_URL = "https:\/\/ninotechy.com"/.test(fs.readFileSync("src/lib/builder.ts", "utf8")));
});

import { bookingEmails, leadEmail } from "./notifications";
test("booking emails: customer gets a tracking link, staff get the order and a link to open it", () => {
  const m = bookingEmails({ ref: "EK-ABC234", name: "Ana <Silva>", email: "ana@example.com", whatsapp: "+351912000111", tour: "Giza Pyramids & Sphinx", travelDate: "2026-11-20", adults: 2, children: 1, infants: 0, total: 197.5, deposit: 98.75, currency: "USD", hotel: "Marriott", company: "Egypt Knight Tours", trackUrl: "https://x.test/track/EK-ABC234?t=tok", adminUrl: "https://x.test/admin?open=1", builder: "Nino Techy" });
  assert.ok(m.customer.html.includes("https://x.test/track/EK-ABC234?t=tok")); assert.ok(m.customer.text.includes("EK-ABC234")); assert.ok(m.customer.text.includes("$98.75")); assert.ok(m.customer.html.includes("Nino Techy"));
  assert.ok(m.staff.subject.includes("EK-ABC234")); assert.ok(m.staff.html.includes("https://x.test/admin?open=1")); assert.ok(!m.staff.html.includes("<Silva>"), "customer input is escaped"); assert.ok(m.staff.text.includes("2 adults, 1 child"));
});
test("inquiry email lists what was asked and escapes input", () => {
  const e = leadEmail({ name: "Bob", email: "b@example.com", whatsapp: "", kind: "TRIP_BUILDER", country: "UK", message: "<script>x</script>", travelDates: "March", travelers: "2", adminUrl: "https://x.test/admin/leads" });
  assert.ok(e.html.includes("&lt;script&gt;")); assert.ok(!e.html.includes("<script>")); assert.ok(e.subject.includes("Bob"));
});
