import test from "node:test";
import assert from "node:assert/strict";
import { monthBounds } from "./finance";

test("month bounds cover the whole calendar month in UTC", () => {
  const { from, to, label } = monthBounds({ year: 2026, month: 2 });
  assert.equal(from.toISOString(), "2026-02-01T00:00:00.000Z"); assert.equal(to.toISOString(), "2026-03-01T00:00:00.000Z"); assert.equal(label, "February 2026");
});
test("December rolls into the next year", () => {
  const { to } = monthBounds({ year: 2026, month: 12 }); assert.equal(to.toISOString(), "2027-01-01T00:00:00.000Z");
});
