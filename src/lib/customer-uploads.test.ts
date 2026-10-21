import test from "node:test";
import assert from "node:assert/strict";
import { uploadKindFor, passportStates, passportsComplete, singleUploadState, uploadProblem, parseRejectReason, parseReceiptAmount, type UploadRow } from "./customer-uploads";

const up = (o: Partial<UploadRow>): UploadRow => ({ id: "u", requestId: "r1", travelerId: null, kind: "PASSPORT", status: "PENDING", rejectReason: null, createdAt: 1, ...o });
test("each request takes the right upload", () => {
  assert.equal(uploadKindFor({ kind: "PASSPORTS" }), "PASSPORT"); assert.equal(uploadKindFor({ kind: "BALANCE" }), "PAYMENT_PROOF");
  assert.equal(uploadKindFor({ kind: "NOTE" }), null); assert.equal(uploadKindFor({ kind: "NOTE", needsUpload: true }), "FILE");
});
test("passport per traveler: received, checking, rejected (latest wins), needed", () => {
  const travelers = [{ id: "a", name: "Satish", hasPassport: true }, { id: "b", name: "Asha", hasPassport: false }, { id: "c", name: "Ravi", hasPassport: false }, { id: "d", name: "Mia", hasPassport: false }];
  const uploads = [up({ travelerId: "b" }), up({ travelerId: "c", status: "REJECTED", rejectReason: "Blurry", createdAt: 1 }), up({ travelerId: "d", status: "REJECTED", rejectReason: "Blurry", createdAt: 1 }), up({ travelerId: "d", status: "PENDING", createdAt: 2 })];
  assert.deepEqual(passportStates(travelers, uploads).map((s) => [s.name, s.state, s.reason]), [["Satish", "RECEIVED", ""], ["Asha", "CHECKING", ""], ["Ravi", "REJECTED", "Blurry"], ["Mia", "CHECKING", ""]]);
  assert.equal(passportsComplete(travelers), false);
  assert.equal(passportsComplete(travelers.map((t) => ({ ...t, hasPassport: true }))), true);
  assert.equal(passportsComplete([]), false);
});
test("receipt state", () => {
  assert.equal(singleUploadState("r1", []).state, "NEEDED");
  assert.equal(singleUploadState("r1", [up({ kind: "PAYMENT_PROOF" })]).state, "CHECKING");
  assert.deepEqual(singleUploadState("r1", [up({ kind: "PAYMENT_PROOF", status: "REJECTED", rejectReason: "Wrong amount" })]), { state: "REJECTED", reason: "Wrong amount" });
  assert.equal(singleUploadState("r1", [up({ kind: "PAYMENT_PROOF", status: "APPROVED" })]).state, "NEEDED", "an approved receipt is a payment now; the balance decides");
});
test("upload checks", () => {
  const ok = { size: 100_000, mime: "image/jpeg", requestOpen: true, kind: "PASSPORT" as const, travelerOk: true, pending: 0, cancelled: false };
  assert.equal(uploadProblem(ok), "");
  assert.match(uploadProblem({ ...ok, size: 5_000_000 }), /under 4 MB/);
  assert.match(uploadProblem({ ...ok, mime: null }), /JPG, PNG, WebP\) or a PDF/);
  assert.match(uploadProblem({ ...ok, travelerOk: false }), /traveler/);
  assert.match(uploadProblem({ ...ok, requestOpen: false }), /don't need/);
  assert.match(uploadProblem({ ...ok, cancelled: true }), /cancelled/);
  assert.match(uploadProblem({ ...ok, pending: 30 }), /WhatsApp/);
});
test("reject reason and receipt amount", () => {
  assert.equal(parseRejectReason("").ok, false); assert.deepEqual(parseRejectReason(" Blurry photo "), { ok: true, reason: "Blurry photo" });
  assert.deepEqual(parseReceiptAmount("11,080", 11080), { ok: true, amount: 11080 });
  assert.equal(parseReceiptAmount("0", 100).ok, false); assert.equal(parseReceiptAmount("200", 100).ok, false);
});
