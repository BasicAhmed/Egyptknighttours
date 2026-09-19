import test from "node:test";
import assert from "node:assert/strict";
process.env.AUTH_SECRET = "unit-test-secret-1234567890";
import { signRef, verifyRef, normalizeRef } from "./booking-token";

test("token verifies for its own ref only", () => {
  const t = signRef("EK-ABC234");
  assert.equal(verifyRef("EK-ABC234", t), true);
  assert.equal(verifyRef("EK-ABC235", t), false);
  assert.equal(verifyRef("EK-ABC234", "nope"), false);
  assert.equal(verifyRef("EK-ABC234", null), false);
});
test("ref normalisation accepts sloppy input", () => {
  assert.equal(normalizeRef("ek-abc234"), "EK-ABC234");
  assert.equal(normalizeRef(" EK ABC234 "), "EK-ABC234");
  assert.equal(normalizeRef("EK-12"), null);
  assert.equal(normalizeRef("XX-ABC234"), null);
});
