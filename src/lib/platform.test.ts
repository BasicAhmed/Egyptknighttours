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

test("form fields are never defined inside a component (that rebuilds the input on every letter and closes the phone keyboard)", () => {
  for (const f of ["src/components/OrderPeople.tsx", "src/components/OrdersBoard.tsx"]) {
    const src = fs.readFileSync(f, "utf8");
    assert.ok(!/\n\s+const F = \(/.test(src), `${f} defines a field component inside another component`);
    assert.ok(/FieldCtx/.test(src), `${f} should use the shared FormField`);
  }
});

import { signGuide, verifyGuide, signRef } from "./booking-token";
import { buildGuideMessage } from "./guide-message";
import type { Order, Guide } from "./orders";
test("guide links only open their own booking, and are not the customer's tracking token", () => {
  process.env.AUTH_SECRET ||= "unit-test-secret-1234567890"; const t = signGuide("booking-1"); assert.ok(verifyGuide("booking-1", t)); assert.ok(!verifyGuide("booking-2", t)); assert.ok(!verifyGuide("booking-1", signRef("booking-1"))); assert.ok(!verifyGuide("booking-1", "")); assert.ok(!verifyGuide("booking-1", t + "x"));
});
test("the guide's WhatsApp message carries the full trip and the private link, but never passport data", () => {
  const o = { id: "b1", ref: "EK-ABC234", title: "Giza Pyramids Tour", travelDate: "2026-11-20", adults: 2, children: 1, infants: 0, isPrivate: true, hotel: "Marriott Mena House", pickupNotes: "Lobby", requests: "Birthday cake", dietary: "No pork", accessibility: "", currency: "USD", total: 200, paid: 100, balance: 100,
    customer: { name: "Sarah Johnson", whatsapp: "+14155550123", phone: "", nationality: "United States", email: "s@x.com", country: "" },
    ops: { pickupTime: "08:00", preferredLanguage: "English", driver: "Ahmed", vehicle: "Van", flightArrival: "MS 985", flightDeparture: "", roomType: "", occasion: "Birthday", emergencyContact: "Mark +1 415 555 0188", guideId: "g1", visaStatus: "", guideNotes: "Collect the balance in cash", flightsX: "" },
    travelers: [{ name: "Sarah Johnson", type: "ADULT", age: null, nationality: "United States", passportNumber: "P1234567", passportExpiry: "2029-01-01", files: [{ id: "f1", kind: "PASSPORT" }] }, { name: "Emma Johnson", type: "CHILD", age: 7, nationality: "United States", passportNumber: "P7654321", files: [] }] } as unknown as Order;
  const m = buildGuideMessage(o, { id: "g1", name: "Omar Hassan", phone: "+201000000001", languages: "English", active: true } as Guide, "https://x.test/guide/b1?t=tok");
  for (const want of ["Notes from the office: Collect the balance in cash", "Hi Omar", "Giza Pyramids Tour", "EK-ABC234", "08:00", "Marriott Mena House", "2 adults, 1 child (ages 7)", "(private)", "English", "Sarah Johnson", "No pork", "Birthday", "Balance", "1. Sarah Johnson", "2. Emma Johnson (child 7)", "https://x.test/guide/b1?t=tok", "Emergency contact: Mark"]) assert.ok(m.includes(want), `missing: ${want}`);
  assert.ok(!/P1234567|P7654321|passport/i.test(m), "passport data must never be in the message");
});
