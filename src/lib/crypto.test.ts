import test from "node:test";
import assert from "node:assert/strict";
process.env.AUTH_SECRET = "unit-test-secret-1234567890";
import { encryptBuffer, decryptBuffer, encryptText, decryptText } from "./crypto";

test("file bytes round-trip and are not stored in the clear", () => {
  const plain = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const enc = encryptBuffer(plain);
  assert.notDeepEqual(enc.subarray(0, 4), plain.subarray(0, 4));
  assert.equal(enc.includes(plain), false);
  assert.deepEqual(decryptBuffer(enc), plain);
});
test("tampering is detected", () => {
  const enc = encryptBuffer(Buffer.from("passport"));
  enc[enc.length - 1] ^= 1;
  assert.throws(() => decryptBuffer(enc));
});
test("text round-trip; old plain text still readable", () => {
  assert.equal(decryptText(encryptText("P1234567")), "P1234567");
  assert.equal(decryptText("plain-old"), "plain-old");
  assert.equal(encryptText(""), "");
});
test("same input encrypts differently each time", () => { assert.notEqual(encryptText("x"), encryptText("x")); });
