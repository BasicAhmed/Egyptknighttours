import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuote } from "./pricing";

const tour = { pricingModel: "PER_PERSON", price: 100, discountPrice: null, childPercent: 50, privateSurcharge: 40, maxTravelers: 10, isPrivateAvailable: true, isGroupAvailable: true };
const base = { tour, adults: 2, children: 0, infants: 0, isPrivate: false, addons: [], coupon: null, payMode: "DEPOSIT" as const };

test("per person adults", () => assert.equal(calculateQuote(base).total, 200));
test("children half price, infants free", () => assert.equal(calculateQuote({ ...base, children: 2, infants: 1 }).total, 300));
test("private surcharge", () => assert.equal(calculateQuote({ ...base, isPrivate: true }).total, 240));
test("discount price used", () => assert.equal(calculateQuote({ ...base, tour: { ...tour, discountPrice: 80 } }).total, 160));
test("addons per person and per booking", () => {
  const q = calculateQuote({ ...base, addons: [{ id: "a", price: 10, unit: "PER_PERSON" }, { id: "b", price: 25, unit: "PER_BOOKING" }] });
  assert.equal(q.addonsTotal, 45); assert.equal(q.total, 245);
});
test("percent coupon", () => assert.equal(calculateQuote({ ...base, coupon: { type: "PERCENT", value: 10, minSubtotal: 0 } }).total, 180));
test("fixed coupon capped at subtotal", () => assert.equal(calculateQuote({ ...base, coupon: { type: "FIXED", value: 999, minSubtotal: 0 } }).total, 0));
test("coupon ignored below min subtotal", () => assert.equal(calculateQuote({ ...base, coupon: { type: "PERCENT", value: 10, minSubtotal: 500 } }).total, 200));
test("deposit 50% and balance", () => { const q = calculateQuote(base); assert.equal(q.deposit, 100); assert.equal(q.dueLater, 100); });
test("full pay and pay later", () => {
  assert.equal(calculateQuote({ ...base, payMode: "FULL" }).deposit, 200);
  assert.equal(calculateQuote({ ...base, payMode: "PAY_LATER" }).deposit, 0);
});
test("per group flat price", () => assert.equal(calculateQuote({ ...base, tour: { ...tour, pricingModel: "PER_GROUP", price: 300 }, adults: 5 }).total, 300));

import { itineraryPrice } from "./pricing";
test("itinerary price: adults and children can have different prices", () => {
  const fmt = (n: number) => `€${n}`;
  const p = itineraryPrice({ cost: 600, childCost: 550, margin: 0, adults: 2, children: 2, fmt });
  assert.equal(p.total, 2300); assert.equal(p.costTotal, 2300); assert.equal(p.split, true);
  assert.deepEqual(p.lines.map((l) => [l.label, l.amount]), [["2 adults × €600", 1200], ["2 children × €550", 1100]]);
  assert.equal(p.perPerson, "€600 per adult, €550 per child");
  const m = itineraryPrice({ cost: 500, childCost: 400, margin: 20, adults: 1, children: 1, fmt });
  assert.equal(m.total, 1080); assert.equal(m.costTotal, 900); assert.equal(m.lines[1].label, "1 child × €480");
  // No child price, or no children: one line, same as before
  const same = itineraryPrice({ cost: 600, childCost: null, margin: 0, adults: 2, children: 2, fmt });
  assert.equal(same.total, 2400); assert.equal(same.split, false); assert.equal(same.lines[0].label, "4 travelers × €600");
  assert.equal(itineraryPrice({ cost: 600, childCost: 550, margin: 0, adults: 2, children: 0, fmt }).lines.length, 1);
  // Children only still bills them at the child price
  assert.equal(itineraryPrice({ cost: 600, childCost: 550, margin: 0, adults: 0, children: 2, fmt }).total, 1100);
  // An order with nobody counted is priced for one person, as before
  assert.equal(itineraryPrice({ cost: 600, margin: 0, adults: 0, children: 0, fmt }).total, 600);
});

import { tripLines } from "./pricing";
test("invoice prints the adult and child lines only while they still match the order", () => {
  const fmt = (n: number) => `€${n}`;
  const saved = JSON.stringify(itineraryPrice({ cost: 600, childCost: 550, margin: 0, adults: 2, children: 2, fmt }).lines);
  assert.deepEqual(tripLines("Cairo & Nile", "2 adults, 2 children", 2300, saved, { adults: 2, children: 2 }),
    [{ label: "Cairo & Nile: 2 adults × €600", amount: 1200 }, { label: "Cairo & Nile: 2 children × €550", amount: 1100 }]);
  const one = [{ label: "Cairo & Nile (2 adults, 2 children)", amount: 2500 }];
  assert.deepEqual(tripLines("Cairo & Nile", "2 adults, 2 children", 2500, saved, { adults: 2, children: 2 }), one); // repriced since
  assert.deepEqual(tripLines("Cairo & Nile", "3 adults, 2 children", 2300, saved, { adults: 3, children: 2 }), [{ label: "Cairo & Nile (3 adults, 2 children)", amount: 2300 }]); // a traveler added since
  assert.deepEqual(tripLines("T", "1 adult", 50, null), [{ label: "T (1 adult)", amount: 50 }]);
  assert.deepEqual(tripLines("T", "1 adult", 50, "not json"), [{ label: "T (1 adult)", amount: 50 }]);
});
