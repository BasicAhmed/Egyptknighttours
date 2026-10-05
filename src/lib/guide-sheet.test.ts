import test from "node:test";
import assert from "node:assert/strict";
import { composeGuideSheet } from "./guide-sheet-data";
import { buildGuideMessage } from "./guide-message";
import type { Order } from "./orders";

// An order with every kind of money on it: a price, a discount, a deposit, add-ons with prices, a cost, part payments.
const b = {
  id: "b1", ref: "EK-TEST01", titleOverride: null, travelDate: "2031-03-04", pickupTime: "07:30", hotel: "Mena House", pickupLocation: "Gate 2", meetingPoint: null as string | null, pickupInfo: null as string | null,
  preferredLanguage: "German", isPrivate: true, adults: 2, children: 1, infants: 0, guestName: "Anna Schmidt", driver: "Hassan", vehicle: "Van", flightArrival: "MS 777", flightDeparture: "", roomType: "Double", occasion: "Birthday",
  emergencyContact: "Tom +49 1", dietary: "Vegetarian", accessibility: "", specialRequests: "Late start", guideNotes: "VIP guest", guideCollectAmount: null as number | null, guideCollectNote: null as string | null, currency: "USD",
  // money columns that must never reach the sheet
  subtotal: 913.37, discount: 41.11, total: 872.26, deposit: 436.13, costTotal: 512.9, addonsJson: JSON.stringify([{ id: "a1", name: "Camel ride", price: 23.45, unit: "PER_PERSON" }, { id: "a2", name: "Photographer", price: 61.5, unit: "PER_BOOKING" }]), payMode: "DEPOSIT", source: "VIATOR",
};
const t = { title: "Giza Pyramids Day", meetingPoint: "Hotel lobby", pickupInfo: "Pickup from any Cairo hotel", itinerary: JSON.stringify([{ title: "Morning", text: "Pyramids and Sphinx" }]), included: JSON.stringify(["Guide", "Lunch"]), excluded: JSON.stringify(["Tips"]), whatToBring: "Hat",
  price: 317.77, discountPrice: 299.99, privateSurcharge: 66.6, costPrice: 201.01 };
const c = { name: "Anna S", whatsapp: "+49 151 000", phone: null, nationality: "Germany" };
const sheetOf = (over: Partial<typeof b> = {}) => composeGuideSheet({ b: { ...b, ...over }, t, c, travelers: [{ fullName: "Max", type: "CHILD", age: 9, nationality: "Germany", notes: null }, { fullName: "Anna Schmidt", type: "ADULT", age: null, nationality: "Germany", notes: null }], guideName: "Omar", itineraryContent: null, company: { name: "Egypt Knight Tours", whatsapp: "+20 100", email: "hi@example.com" } });
// any currency sign or code, any amount stored on the order or the tour, any payment word
const MONEY = /[$€£]|\b(USD|EUR|GBP|EGP)\b|913|41\.11|872|436|512\.9|23\.45|61\.5|317\.77|299\.99|66\.6|201\.01|\b(paid|balance|deposit|total|price|cost|payment|margin|profit)\b/i;

test("guide sheet: no price, total, payment, deposit, cost or add-on price", () => {
  const s = sheetOf(); const text = JSON.stringify(s);
  assert.ok(!MONEY.test(text), `money on the sheet: ${MONEY.exec(text)?.[0]}`);
  assert.equal(s.collect, ""); assert.ok(!("total" in s) && !("paid" in s) && !("balance" in s) && !("currency" in s));
  assert.equal(s.customer.name, "Anna Schmidt"); assert.deepEqual(s.travelers.map((x) => x.type), ["ADULT", "CHILD"]);
});
test("guide sheet: the only money is what staff typed for the guide to collect", () => {
  const s = sheetOf({ guideCollectAmount: 35, guideCollectNote: "cash, for the camel ride" });
  assert.equal(s.collect, "$35.00 (cash, for the camel ride)");
  const { collect, ...rest } = s; assert.ok(collect && !MONEY.test(JSON.stringify(rest)));
  assert.equal(sheetOf({ guideCollectNote: "tips are up to the guests" }).collect, "tips are up to the guests");
});
test("guide sheet: pickup and meeting point come from the order, else from the tour", () => {
  const d = sheetOf().pickup; assert.deepEqual([d.time, d.placeLine, d.meetingPoint, d.details], ["07:30", "Mena House, Gate 2", "Hotel lobby", "Pickup from any Cairo hotel"]);
  const o = sheetOf({ meetingPoint: "Museum main gate", pickupInfo: "Driver waits at arrivals" }).pickup; assert.deepEqual([o.meetingPoint, o.details], ["Museum main gate", "Driver waits at arrivals"]);
});

const order = (ops: Partial<Order["ops"]> = {}, pickup: Partial<Order["pickup"]> = {}) => ({
  ref: b.ref, title: t.title, travelDate: b.travelDate, adults: 2, children: 1, infants: 0, isPrivate: true, hotel: b.hotel, pickupNotes: "Gate 2", requests: "Late start", dietary: "Vegetarian", accessibility: "",
  customer: { name: "Anna Schmidt", email: "", whatsapp: "+49 151 000", phone: "", country: "", nationality: "Germany" }, travelers: [{ name: "Anna Schmidt", type: "ADULT", age: null, nationality: "Germany" }, { name: "Max", type: "CHILD", age: 9, nationality: "Germany" }],
  currency: "USD", subtotal: 913.37, discount: 41.11, total: 872.26, deposit: 436.13, paid: 436.13, balance: 436.13, costTotal: 512.9, addons: [{ name: "Camel ride", price: 23.45, unit: "PER_PERSON" }],
  pickup: { meetingPoint: null, details: null, defaults: { meetingPoint: "Hotel lobby", details: "Pickup from any Cairo hotel" }, ...pickup },
  ops: { preferredLanguage: "German", guideId: "g1", driver: "Hassan", vehicle: "Van", flightArrival: "MS 777", flightDeparture: "", roomType: "Double", pickupTime: "07:30", occasion: "Birthday", emergencyContact: "Tom +49 1", visaStatus: "", guideNotes: "VIP guest", collectAmount: "", collectNote: "", ...ops },
}) as unknown as Order;
const guide = { id: "g1", name: "Omar Said", phone: "+20 1", languages: "German", active: true };

test("guide message: no money unless staff asked the guide to collect", () => {
  const m = buildGuideMessage(order(), guide, "https://example.com/guide/b1?t=x");
  assert.ok(!MONEY.test(m.replace(/https:\S+/g, "")), `money in the message: ${MONEY.exec(m)?.[0]}`);
  assert.match(m, /Pickup: Mena House, Gate 2/); assert.match(m, /Meeting point: Hotel lobby/); assert.match(m, /at 07:30/);
  const c2 = buildGuideMessage(order({ collectAmount: "35", collectNote: "cash" }), guide, "https://example.com/g");
  assert.match(c2, /Collect on the day: \$35\.00 \(cash\)/); assert.equal((c2.match(/\$/g) ?? []).length, 1);
});
test("guide message: the order's own meeting point replaces the tour's", () => {
  const m = buildGuideMessage(order({}, { meetingPoint: "Museum main gate", details: "" }), guide, "https://example.com/g");
  assert.match(m, /Meeting point: Museum main gate/); assert.ok(!/Hotel lobby|Pickup details/.test(m));
});
