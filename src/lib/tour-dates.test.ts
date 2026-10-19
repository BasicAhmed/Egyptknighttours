import test from "node:test";
import assert from "node:assert/strict";
import { readFixedDates, parseFixedDates, upcomingDates, dateAllowed, isRealDay } from "./tour-dates";

test("real days only", () => {
  assert.equal(isRealDay("2026-12-28"), true); assert.equal(isRealDay("2026-02-30"), false); assert.equal(isRealDay("28/12/2026"), false); assert.equal(isRealDay(""), false);
});
test("stored dates are cleaned: sorted, no repeats, nothing unreadable", () => {
  assert.deepEqual(readFixedDates('["2026-12-28","2026-11-02","2026-12-28","nope"]'), ["2026-11-02", "2026-12-28"]);
  assert.deepEqual(readFixedDates(""), []); assert.deepEqual(readFixedDates(null), []); assert.deepEqual(readFixedDates("{oops"), []); assert.deepEqual(readFixedDates('{"a":1}'), []);
});
test("form input: empty is fine, bad dates are refused with the date named", () => {
  assert.deepEqual(parseFixedDates(""), { ok: true, dates: [] });
  assert.deepEqual(parseFixedDates("[]"), { ok: true, dates: [] });
  assert.deepEqual(parseFixedDates('["2026-12-28","2026-12-01","2026-12-28"]'), { ok: true, dates: ["2026-12-01", "2026-12-28"] });
  const r = parseFixedDates('["2026-02-30"]'); assert.equal(r.ok, false); assert.match((r as { message: string }).message, /2026-02-30/);
  assert.equal(parseFixedDates("not json").ok, false);
  const many = (n: number) => JSON.stringify(Array.from({ length: n }, (_, k) => new Date(Date.UTC(2027, 0, 1 + k)).toISOString().slice(0, 10)));
  assert.equal(parseFixedDates(many(200)).ok, true); assert.equal(parseFixedDates(many(201)).ok, false);
});
test("only upcoming dates can be picked, and only fixed dates are allowed", () => {
  const dates = ["2026-10-01", "2026-10-20", "2026-12-28"];
  assert.deepEqual(upcomingDates(dates, "2026-10-20"), ["2026-10-20", "2026-12-28"]);
  assert.equal(dateAllowed(dates, "2026-12-28"), true); assert.equal(dateAllowed(dates, "2026-12-27"), false);
  assert.equal(dateAllowed([], "2026-12-27"), true, "no fixed dates: any day");
});
