import test from "node:test";
import assert from "node:assert/strict";
import { pixelAllowedPath, metaEventFor } from "./meta-pixel";

test("the pixel never runs on private pages", () => {
  for (const p of ["/admin", "/admin/finance", "/guide/abc", "/booking/confirmation/EK-1", "/track", "/track/EK-1", "/review/EK-1", "/api/x"]) assert.equal(pixelAllowedPath(p), false, p);
  for (const p of ["/", "/tours", "/tours/giza", "/book/giza", "/contact", "/trackers", "/egypt-travel-guide/visa"]) assert.equal(pixelAllowedPath(p), true, p);
});
test("site events map to Meta standard events", () => {
  assert.deepEqual(metaEventFor("view_tour", { tourSlug: "giza" }), { event: "ViewContent", params: { content_ids: ["giza"], content_type: "product" } });
  assert.deepEqual(metaEventFor("purchase", { tourSlug: "giza", props: { value: 800 } })?.params, { content_ids: ["giza"], content_type: "product", currency: "USD", value: 800 });
  assert.equal(metaEventFor("start_checkout")?.event, "InitiateCheckout");
  assert.equal(metaEventFor("whatsapp_click")?.event, "Contact");
  assert.equal(metaEventFor("contact_form")?.event, "Lead");
  assert.equal(metaEventFor("add_traveler"), null, "small steps are not sent");
});
