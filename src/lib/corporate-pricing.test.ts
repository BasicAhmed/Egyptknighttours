import test from "node:test";
import assert from "node:assert/strict";
import { servicePrices } from "./corporate-constants";

const sum = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100;

test("itemized: each line is the price staff typed", () => {
  assert.deepEqual(servicePrices([{ cost: 80, price: 100 }, { cost: 40, price: 50 }], "ITEMIZED", null), [100, 50]);
});
test("percentage: each line is its cost plus the service percentage", () => {
  const p = servicePrices([{ cost: 100, price: 0 }, { cost: 50, price: 0 }], "PERCENTAGE", 20);
  assert.deepEqual(p, [120, 60]); assert.equal(sum(p), 180);
});
test("percentage: lines always add up to the request total, even with rounding", () => {
  const services = [{ cost: 33.33, price: 0 }, { cost: 33.33, price: 0 }, { cost: 33.34, price: 0 }];
  const p = servicePrices(services, "PERCENTAGE", 12.5);
  assert.equal(sum(p), Math.round(Math.round(100 * 100) / 100 * 1.125 * 100) / 100); // 112.5, same as totals()
  for (const x of p) assert.equal(Math.round(x * 100) / 100, x);
});
test("percentage with no percent set charges the cost", () => {
  assert.deepEqual(servicePrices([{ cost: 70, price: 0 }], "PERCENTAGE", null), [70]);
});
