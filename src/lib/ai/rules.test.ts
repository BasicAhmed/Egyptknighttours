import test from "node:test";
import assert from "node:assert/strict";
import { costOf, readAiConfig, cleanMessage, checkEmail, checkPhone, checkName, checkDraft, draftToContent, leakReport } from "./rules";

test("cost: Haiku is cheap, long prompts cost more, Sonnet is the expensive one", () => {
  const u = { input_tokens: 10_000, output_tokens: 1_000 };
  assert.equal(Math.round(costOf("haiku", u) * 1e6) / 1e6, 0.0015); // 10k × 0.10 + 1k × 0.50 per million
  assert.equal(Math.round(costOf("sonnet", u) * 1e6) / 1e6, 0.03);
  assert.equal(Math.round(costOf("haiku", { input_tokens: 150_000, output_tokens: 0 }) * 1e6) / 1e6, 0.075, "a prompt over 100k uses the higher price");
  assert.equal(Math.round(costOf("haiku", { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 50_000 }) * 1e6) / 1e6, 0.0005, "cached reads are almost free");
});
test("switches start off; the cap is sane", () => {
  assert.deepEqual(readAiConfig({}), { customer: false, staff: false, dailyCapUsd: 1, itineraryModel: "haiku" });
  assert.equal(readAiConfig({ "ai.dailyCapUsd": "-5" }).dailyCapUsd, 1);
  assert.equal(readAiConfig({ "ai.dailyCapUsd": "9999" }).dailyCapUsd, 100);
  assert.equal(readAiConfig({ "ai.customer": "on", "ai.itineraryModel": "sonnet" }).itineraryModel, "sonnet");
});
test("messages are cleaned and limited", () => {
  assert.deepEqual(cleanMessage("  hi​ there ", 100), { ok: true, text: "hi there" });
  assert.equal(cleanMessage("   ", 100).ok, false); assert.equal(cleanMessage("x".repeat(101), 100).ok, false);
});
test("real email only", () => {
  assert.deepEqual(checkEmail(" Satish@Gmail.com "), { ok: true, email: "satish@gmail.com" });
  for (const bad of ["nope", "a@b", "x@mailinator.com", "x@sub.yopmail.com", "test@gmail.com", "me@example.com", "a..b@gmail.com"]) assert.equal(checkEmail(bad).ok, false, bad);
});
test("real phone with country code only", () => {
  assert.deepEqual(checkPhone("+44 7700 900123"), { ok: true, phone: "+447700900123" });
  assert.deepEqual(checkPhone("0020 100 133 9220"), { ok: true, phone: "+201001339220" });
  for (const bad of ["07700900123", "+1111111111", "+123456789", "+12", "call me", "+98765432109"]) assert.equal(checkPhone(bad).ok, false, bad);
});
test("names", () => {
  assert.equal(checkName("Satish Kumar").ok, true); assert.equal(checkName("محمد علي").ok, true);
  for (const bad of ["a", "12345", "http://spam.com", "<b>x</b>"]) assert.equal(checkName(bad).ok, false, bad);
});
const known = { destinations: ["Cairo", "Luxor", "Aswan"], tours: [{ slug: "giza-pyramids", title: "Giza Pyramids Tour" }] };
test("the AI's itinerary is checked against real data", () => {
  const r = checkDraft({ title: "Pyramids and Nile", days: [{ title: "Pyramids", location: "cairo", description: "Giza plateau.", tourSlugs: ["giza-pyramids", "made-up-tour"] }, { title: "Luxor", location: "Atlantis", description: "Temples." }] }, known);
  assert.ok(r.ok); if (!r.ok) return;
  assert.equal(r.draft.days[0].location, "Cairo", "matched to the real name");
  assert.deepEqual(r.draft.days[0].tourSlugs, ["giza-pyramids"], "made-up tour removed");
  assert.equal(r.warnings.length, 2);
  assert.equal(checkDraft({ days: [] }, known).ok, false);
  assert.equal(checkDraft({ days: Array.from({ length: 22 }, () => ({ title: "x", description: "y" })) }, known).ok, false);
  assert.equal(checkDraft({ days: [{ title: "", description: "y" }] }, known).ok, false);
});
test("the draft becomes an unpriced itinerary", () => {
  const r = checkDraft({ title: "Trip", summary: "Nice", days: [{ title: "Pyramids", location: "Cairo", description: "Giza.", tourSlugs: ["giza-pyramids"] }] }, known);
  assert.ok(r.ok); if (!r.ok) return; let n = 0;
  const c = draftToContent(r.draft, known, () => `id${n++}`);
  assert.equal(c.priceLabel, ""); assert.equal(c.days.length, 1); assert.equal(c.days[0].blocks[1].title, "Giza Pyramids Tour"); assert.equal(c.durationDays, 1); assert.deepEqual(c.destinations, ["Cairo"]);
});
test("leakage: worst first, empty ones hidden", () => {
  const r = leakReport({ tourViews: 1000, startedBooking: 80, checkout: 30, purchases: 10, abandoned: 6, inquiriesUnanswered: 0, decidingOver3Days: 4, invoicesOverdue: 0, passportsMissingSoon: 2 });
  assert.equal(r[0].key, "view_to_start"); assert.equal(r[0].count, 920); assert.equal(r[0].rate, 8);
  assert.ok(!r.some((l) => l.key === "unanswered"));
});
