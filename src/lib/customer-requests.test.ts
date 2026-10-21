import test from "node:test";
import assert from "node:assert/strict";
import { requestText, openRequests, parseRequest, defaultBalanceDue } from "./customer-requests";

const ctx = { balance: 11080, currency: "USD", travelDate: "2026-12-28", travelers: 4, ref: "EK-EMT7DK" };
test("balance due date defaults to 21 days before travel", () => {
  assert.equal(defaultBalanceDue("2026-12-28", 21), "2026-12-07");
  assert.equal(defaultBalanceDue("2026-12-28", 0), "2026-12-07", "no setting: 21 days");
  assert.equal(defaultBalanceDue("", 21), null);
});
test("balance request says how much, by when, and how many days before travel", () => {
  const t = requestText({ kind: "BALANCE", text: "", dueDate: "2026-12-07" }, ctx);
  assert.equal(t.title, "Remaining balance: $11,080");
  assert.match(t.detail, /Please pay \$11,080 by Mon, 7 December 2026 \(21 days before your trip\)\. Use your booking ID EK-EMT7DK/);
});
test("passport request counts the travelers", () => {
  assert.match(requestText({ kind: "PASSPORTS", text: "", dueDate: null }, ctx).detail, /each of the 4 travelers/);
  assert.match(requestText({ kind: "PASSPORTS", text: "", dueDate: null }, { ...ctx, travelers: 1 }).detail, /for the traveler/);
});
test("a note: first line is the title, the rest the detail", () => {
  assert.deepEqual(requestText({ kind: "NOTE", text: "Bring warm clothes\nNights on the cruise are cold.", dueDate: null }, ctx), { title: "Bring warm clothes", detail: "Nights on the cruise are cold." });
});
test("open requests: important first, then by date; paid balance disappears; done ones hidden", () => {
  const r = (id: string, o: Partial<{ kind: string; status: string; important: boolean; dueDate: string | null; createdAt: number }>) => ({ id, kind: "NOTE", status: "OPEN", important: false, dueDate: null, createdAt: 1, ...o });
  const list = [r("a", { dueDate: "2026-12-01" }), r("b", { important: true }), r("c", { kind: "BALANCE" }), r("d", { status: "DONE" }), r("e", { dueDate: "2026-11-01" })];
  assert.deepEqual(openRequests(list, 100).map((x) => x.id), ["b", "e", "a", "c"]);
  assert.deepEqual(openRequests(list, 0).map((x) => x.id), ["b", "e", "a"]);
});
test("new request is checked", () => {
  assert.equal(parseRequest({ kind: "NOTE", text: "" }).ok, false);
  assert.equal(parseRequest({ kind: "WHATEVER" }).ok, false);
  assert.equal(parseRequest({ kind: "BALANCE", dueDate: "2026-02-30" }).ok, false);
  assert.deepEqual(parseRequest({ kind: "PASSPORTS", important: true, dueDate: "2026-12-01" }), { ok: true, value: { kind: "PASSPORTS", text: "", important: true, dueDate: "2026-12-01", needsUpload: false } });
});

test("a note can ask for a file; passports and receipts never need the tick", () => {
  assert.equal((parseRequest({ kind: "NOTE", text: "Signed waiver", needsUpload: true }) as { value: { needsUpload: boolean } }).value.needsUpload, true);
  assert.equal((parseRequest({ kind: "BALANCE", needsUpload: true }) as { value: { needsUpload: boolean } }).value.needsUpload, false);
});
