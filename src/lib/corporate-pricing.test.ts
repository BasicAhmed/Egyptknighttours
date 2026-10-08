import test from "node:test";
import assert from "node:assert/strict";
import { servicePrices, requestTotals, paymentProblem, balanceOf, isSettled, normalizeServiceType, businessDay } from "./corporate-constants";

const sum = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100;
const sv = (cost: number, price = 0, status = "PENDING") => ({ cost, price, status });

test("itemized: each line is the price staff typed, and they add up to the total", () => {
  const s = [sv(80, 100), sv(40, 50)];
  assert.deepEqual(servicePrices(s, "ITEMIZED", null), [100, 50]);
  assert.deepEqual(requestTotals(s, "ITEMIZED", null), { cost: 120, price: 150, profit: 30 });
});
test("percentage: each line is its cost plus the service percentage", () => {
  const s = [sv(100), sv(50)];
  assert.deepEqual(servicePrices(s, "PERCENTAGE", 20), [120, 60]);
  assert.deepEqual(requestTotals(s, "PERCENTAGE", 20), { cost: 150, price: 180, profit: 30 });
});
test("percentage: lines always add up to the request total, even with rounding", () => {
  for (const pct of [12.5, 7, 33.333, 15]) {
    const s = [sv(33.33), sv(33.33), sv(33.34), sv(19.99)];
    const lines = servicePrices(s, "PERCENTAGE", pct);
    assert.equal(sum(lines), requestTotals(s, "PERCENTAGE", pct).price, `pct ${pct}`);
    for (const x of lines) assert.equal(Math.round(x * 100) / 100, x);
  }
});
test("percentage with no percent set charges the cost", () => {
  assert.deepEqual(servicePrices([sv(70)], "PERCENTAGE", null), [70]);
});
test("a cancelled service is kept but not charged, in both pricing modes", () => {
  const s = [sv(100, 130), sv(40, 60, "CANCELLED"), sv(10, 15, "DONE")];
  assert.deepEqual(requestTotals(s, "ITEMIZED", null), { cost: 110, price: 145, profit: 35 });
  assert.deepEqual(servicePrices(s, "ITEMIZED", null), [130, 0, 15]);
  assert.deepEqual(requestTotals(s, "PERCENTAGE", 10), { cost: 110, price: 121, profit: 11 });
  const lines = servicePrices(s, "PERCENTAGE", 10);
  assert.equal(lines[1], 0); assert.equal(sum(lines), 121);
});
test("rounding never lands on a cancelled line", () => {
  const s = [sv(500, 0, "CANCELLED"), sv(33.33), sv(33.33)];
  const lines = servicePrices(s, "PERCENTAGE", 12.5);
  assert.equal(lines[0], 0); assert.equal(sum(lines), requestTotals(s, "PERCENTAGE", 12.5).price);
});
test("balance, paid in full and overpaid", () => {
  assert.equal(balanceOf(180, 100), 80);
  assert.equal(isSettled(180, 180), true); assert.equal(isSettled(180, 179.99), false);
  assert.equal(balanceOf(150, 180), -30); assert.equal(isSettled(150, 180), true);
  assert.equal(isSettled(0, 0), false); // nothing priced is not "paid in full"
});
test("payment rules: one place decides what can be recorded", () => {
  const base = { status: "CONFIRMED", price: 180, paid: 100, currency: "USD" };
  assert.equal(paymentProblem({ ...base, amount: 80 }), "");
  assert.equal(paymentProblem({ ...base, amount: 50 }), "");
  assert.match(paymentProblem({ ...base, amount: 80.5 }), /more than the \$80 still due/);
  assert.match(paymentProblem({ ...base, amount: 0 }), /above zero/);
  assert.match(paymentProblem({ ...base, amount: -5 }), /above zero/);
  assert.match(paymentProblem({ ...base, status: "CANCELLED", amount: 10 }), /cancelled/);
  assert.match(paymentProblem({ ...base, price: 0, paid: 0, amount: 10 }), /Price the services first/);
  assert.match(paymentProblem({ ...base, paid: 180, amount: 10 }), /already paid in full/);
  assert.match(paymentProblem({ ...base, currency: "EGP", amount: 500 }), /EGP/);
});
test("service types are stored as one code whatever the wording", () => {
  assert.equal(normalizeServiceType("Transfer"), "TRANSFER");
  assert.equal(normalizeServiceType(" transfer "), "TRANSFER");
  assert.equal(normalizeServiceType("NILE_CRUISE"), "NILE_CRUISE");
  assert.equal(normalizeServiceType("Motor / boat"), "MOTOR_BOAT");
  assert.equal(normalizeServiceType("Camel ride at sunset"), "Camel ride at sunset");
});
test("payment days follow Cairo time, not the server's UTC day", () => {
  assert.equal(businessDay("2026-11-14T22:30:00Z"), "2026-11-15"); // 00:30 in Cairo (UTC+2 in winter)
  assert.equal(businessDay("2026-11-14T20:00:00Z"), "2026-11-14");
});
