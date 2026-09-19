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
test("deposit 30% and balance", () => { const q = calculateQuote(base); assert.equal(q.deposit, 60); assert.equal(q.dueLater, 140); });
test("full pay and pay later", () => {
  assert.equal(calculateQuote({ ...base, payMode: "FULL" }).deposit, 200);
  assert.equal(calculateQuote({ ...base, payMode: "PAY_LATER" }).deposit, 0);
});
test("per group flat price", () => assert.equal(calculateQuote({ ...base, tour: { ...tour, pricingModel: "PER_GROUP", price: 300 }, adults: 5 }).total, 300));
