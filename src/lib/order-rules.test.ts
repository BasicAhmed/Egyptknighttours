import test from "node:test";
import assert from "node:assert/strict";
import { isPrepaid, prepaidVia, showPriceToCustomer, customerItinerary, planStyleChange, resolvePickup, pickupOverride, parsePickupTime, parseCollect, collectLine, type StyleInput } from "./order-rules";
import { calculateQuote } from "./pricing";

test("prepaid sources: Viator is, direct channels are not", () => {
  assert.equal(isPrepaid("VIATOR"), true); assert.equal(isPrepaid("viator"), true); assert.equal(prepaidVia("VIATOR"), "Viator");
  for (const s of ["WEBSITE", "WHATSAPP", "EMAIL", "PHONE", "", null, undefined]) assert.equal(isPrepaid(s), false);
});
test("price on the customer's itinerary: off for prepaid orders, on otherwise, staff's choice wins", () => {
  assert.equal(showPriceToCustomer(null, "VIATOR"), false); assert.equal(showPriceToCustomer(undefined, "WHATSAPP"), true); assert.equal(showPriceToCustomer(null, null), true);
  assert.equal(showPriceToCustomer(true, "VIATOR"), true); assert.equal(showPriceToCustomer(false, "WEBSITE"), false);
});
test("the customer's copy with the price hidden carries no price, terms or pay button", () => {
  const c = { title: "Cairo", priceLabel: "$120 per person — $240 total for 2 travelers", paymentTerms: "50% deposit", ctaUrl: "https://pay.example.com/x", ctaLabel: "Pay now", included: ["Guide"] };
  assert.deepEqual(customerItinerary(c, true), c);
  const h = customerItinerary(c, false);
  assert.deepEqual([h.priceLabel, h.paymentTerms, h.ctaUrl, h.ctaLabel], ["", "", "", ""]); assert.equal(h.title, "Cairo"); assert.deepEqual(h.included, ["Guide"]);
  assert.ok(!/\$|deposit|pay/i.test(Object.values(h).flat().join(" ")));
  assert.equal(c.priceLabel.length > 0, true, "the staff copy is not touched");
});

const tour = { title: "Giza Day", custom: false, pricingModel: "PER_PERSON", price: 55, discountPrice: null, childPercent: 50, privateSurcharge: 60, maxTravelers: 12, isPrivateAvailable: true, isGroupAvailable: true };
const base = (over: Partial<StyleInput> = {}, order: Partial<StyleInput["order"]> = {}): StyleInput => ({
  toPrivate: true, isPrivate: false, isTourOrder: true, onGroupTour: false, cancelled: false, basis: "TOUR", tour,
  order: { adults: 2, children: 0, infants: 0, subtotal: 110, discount: 0, total: 110, deposit: 55, payMode: "DEPOSIT", addons: [], coupon: null, ...order }, ...over,
});
test("style: a tour-priced order moves to the tour's other price, deposit keeps its share", () => {
  const up = planStyleChange(base()); assert.ok(up.ok && !up.same && up.reprice);
  assert.deepEqual(up.reprice, { subtotal: 170, discount: 0, total: 170, deposit: 85 });
  assert.equal(up.reprice.total, calculateQuote({ tour, adults: 2, children: 0, infants: 0, isPrivate: true, addons: [], coupon: null, payMode: "DEPOSIT" }).total);
  const down = planStyleChange(base({ toPrivate: false, isPrivate: true }, { subtotal: 170, total: 170, deposit: 170, payMode: "FULL" })); assert.ok(down.ok && !down.same && down.reprice);
  assert.deepEqual(down.reprice, { subtotal: 110, discount: 0, total: 110, deposit: 110 });
});
test("style: add-ons, a percent coupon and an older base price are kept; only the private upgrade moves", () => {
  // booked when the tour cost 50 per person, with a 12-per-person lunch and 10% off
  const p = planStyleChange(base({}, { subtotal: 124, discount: 12.4, total: 111.6, deposit: 55.8, addons: [{ price: 12, unit: "PER_PERSON" }], coupon: { type: "PERCENT", value: 10, minSubtotal: 0 } }));
  assert.ok(p.ok && !p.same && p.reprice);
  assert.deepEqual(p.reprice, { subtotal: 184, discount: 18.4, total: 165.6, deposit: 82.8 });
});
test("style: itinerary, prepaid and hand-priced orders change the label only", () => {
  for (const basis of ["ITINERARY", "PREPAID", "MANUAL"] as const) { const p = planStyleChange(base({ basis }, { subtotal: 240, total: 240 })); assert.ok(p.ok && !p.same); assert.equal(p.reprice, null); assert.match(p.note, /price stays/i); }
  const unpriced = planStyleChange(base({ basis: "MANUAL" }, { subtotal: 0, total: 0, deposit: 0 })); assert.ok(unpriced.ok && !unpriced.same && unpriced.reprice === null);
  const noUpgrade = planStyleChange(base({ tour: { ...tour, privateSurcharge: 0 } })); assert.ok(noUpgrade.ok && !noUpgrade.same && noUpgrade.reprice === null);
});
test("style: refused where the tour does not offer it, on a group tour, on other order types; same style is a no-op", () => {
  const a = planStyleChange(base({ tour: { ...tour, isPrivateAvailable: false } })); assert.ok(!a.ok && /not offered as a private tour/.test(a.why));
  const b = planStyleChange(base({ toPrivate: false, isPrivate: true, tour: { ...tour, isGroupAvailable: false } })); assert.ok(!b.ok && /private-only/.test(b.why));
  const g = planStyleChange(base({ onGroupTour: true })); assert.ok(!g.ok && /group tour/.test(g.why));
  const s = planStyleChange(base({ isTourOrder: false })); assert.ok(!s.ok);
  assert.deepEqual(planStyleChange(base({ toPrivate: false })), { ok: true, same: true });
  // the placeholder tour behind a custom experience offers both
  const c = planStyleChange(base({ basis: "ITINERARY", tour: { ...tour, custom: true, isPrivateAvailable: false } })); assert.ok(c.ok);
  const x = planStyleChange(base({ cancelled: true })); assert.ok(!x.ok && /cancelled/.test(x.why));
  const xl = planStyleChange(base({ cancelled: true, basis: "ITINERARY" })); assert.ok(xl.ok, "a label-only change is fine on a cancelled order");
});

test("pickup: the order's own text, else the tour's, else nothing", () => {
  const t = { meetingPoint: "Hotel lobby", pickupInfo: "Pickup from any Cairo hotel" };
  const d = resolvePickup({ hotel: "Mena House", pickupLocation: "Gate 2", pickupTime: "08:00" }, t);
  assert.equal(d.meetingPoint, "Hotel lobby"); assert.equal(d.details, "Pickup from any Cairo hotel"); assert.deepEqual(d.own, { meetingPoint: false, details: false });
  assert.equal(d.placeLine, "Mena House, Gate 2"); assert.equal(d.summary, "08:00 · Mena House, Gate 2");
  const o = resolvePickup({ hotel: "Mena House", meetingPoint: "Main gate of the Grand Museum", pickupInfo: "" }, t);
  assert.equal(o.meetingPoint, "Main gate of the Grand Museum"); assert.equal(o.details, "", "an empty text on the order means: show nothing"); assert.deepEqual(o.own, { meetingPoint: true, details: true });
  const e = resolvePickup({}, {}); assert.deepEqual([e.place, e.time, e.meetingPoint, e.details, e.summary], ["", "", "", "", ""]);
});
test("pickup: only a text that differs from the tour's is stored on the order", () => {
  assert.equal(pickupOverride(null, "Hotel lobby"), null); assert.equal(pickupOverride(undefined, "Hotel lobby"), null);
  assert.equal(pickupOverride(" Hotel lobby ", "Hotel lobby"), null); assert.equal(pickupOverride("Gate 4", "Hotel lobby"), "Gate 4"); assert.equal(pickupOverride("", "Hotel lobby"), "");
  assert.equal(pickupOverride("", ""), null);
});
test("pickup time: times and windows, stored as 24-hour", () => {
  const ok = (v: string, out: string) => assert.deepEqual(parsePickupTime(v), { ok: true, value: out });
  ok("", ""); ok("08:00", "08:00"); ok("8:05", "08:05"); ok("8.30", "08:30"); ok("7:45pm", "19:45"); ok("12 am", "00:00"); ok("8 AM", "08:00"); ok("08:00-08:30", "08:00-08:30"); ok("8:00 to 8:30", "08:00-08:30"); ok("23:59", "23:59");
  for (const bad of ["8", "25:00", "08:60", "morning", "8:00-", "13pm", "08:00-09:00-10:00", "0800"]) assert.deepEqual(parsePickupTime(bad), { ok: false }, bad);
});
test("collect on the day: empty unless staff fill it in", () => {
  assert.deepEqual(parseCollect("", ""), { ok: true, amount: null, note: "" }); assert.deepEqual(parseCollect("0", " cash "), { ok: true, amount: null, note: "cash" });
  assert.deepEqual(parseCollect("1,250.5", "cash"), { ok: true, amount: 1250.5, note: "cash" }); assert.deepEqual(parseCollect(50, ""), { ok: true, amount: 50, note: "" });
  assert.equal(parseCollect("abc", "").ok, false); assert.equal(parseCollect("-5", "").ok, false); assert.equal(parseCollect("5", "x".repeat(201)).ok, false);
  assert.equal(collectLine(null, "", "USD"), ""); assert.equal(collectLine(0, null, "USD"), ""); assert.equal(collectLine(50, "", "USD"), "$50.00");
  assert.equal(collectLine(50, "cash", "EUR"), "€50.00 (cash)"); assert.equal(collectLine(null, "tips are welcome", "USD"), "tips are welcome");
});
