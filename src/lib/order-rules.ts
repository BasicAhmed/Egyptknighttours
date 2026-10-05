import { calculateQuote, r2, DEPOSIT_PERCENT, type PriceTour, type PriceCoupon } from "./pricing";
import type { ItineraryContent } from "@/pdf/types";

// ---------- Order rules that more than one screen or document depends on ----------
// Each rule is written ONCE here and read by everything that needs it: the order window, the itinerary editor, the PDFs,
// the emails, the customer's tracking page, the guide sheet and the calendar file.
// No database or server imports: the browser, the server, the PDF code and the unit tests all use this file.

// ---------- 1. Money a marketplace already collected ----------
// An order that came through one of these channels was paid to that marketplace, not to us: nothing we send the customer
// may show a price or ask for money. Staff still see every amount. Add a channel here and every rule below follows.
export const PREPAID_SOURCES: Record<string, string> = { VIATOR: "Viator" };
export const prepaidVia = (source?: string | null): string => PREPAID_SOURCES[String(source ?? "").toUpperCase()] ?? "";
export const isPrepaid = (source?: string | null): boolean => prepaidVia(source) !== "";

// Does the customer's copy of an itinerary carry the price? Staff's own choice on that itinerary wins; with no choice
// made it follows the order: hidden when the order was prepaid through a marketplace, shown otherwise.
export function showPriceToCustomer(choice: boolean | null | undefined, orderSource?: string | null): boolean {
  return choice ?? !isPrepaid(orderSource);
}
// The itinerary as the customer receives it. With the price hidden, the price line, the payment terms and the pay button
// (its link and its label) are taken out of the data itself, so no design, link or email can show them by accident.
export function customerItinerary<T extends Pick<ItineraryContent, "priceLabel" | "paymentTerms" | "ctaUrl" | "ctaLabel">>(content: T, showPrice: boolean): T {
  return showPrice ? content : { ...content, priceLabel: "", paymentTerms: "", ctaUrl: "", ctaLabel: "" };
}

// ---------- 2. Private or shared ----------
export const styleLabel = (isPrivate: boolean) => (isPrivate ? "Private" : "Shared");
// What an order's price comes from. Only a price that came from the tour's own price list moves with the style.
export type StyleBasis = "TOUR" | "ITINERARY" | "PREPAID" | "MANUAL";
export type StyleInput = {
  toPrivate: boolean; isPrivate: boolean; isTourOrder: boolean; onGroupTour: boolean; cancelled: boolean; basis: StyleBasis;
  tour: PriceTour & { title: string; custom: boolean };
  order: { adults: number; children: number; infants: number; subtotal: number; discount: number; total: number; deposit: number; payMode: string; addons: { price: number; unit: string }[]; coupon: PriceCoupon };
};
export type StylePlan =
  | { ok: false; why: string }
  | { ok: true; same: true }
  | { ok: true; same: false; reprice: { subtotal: number; discount: number; total: number; deposit: number } | null; note: string };

const BASIS_NOTE: Record<StyleBasis, string> = {
  TOUR: "The price is the same for private and shared on this tour.",
  ITINERARY: "The price stays as it is: this order is priced by its itinerary.",
  PREPAID: "The price stays as it is: this order was paid through the marketplace it came from.",
  MANUAL: "The price stays as it is: it does not come from the tour's price list.",
};
// Changing an order between private and shared: may it, and what happens to the price.
// A price taken from the tour moves by exactly what the tour charges for the other style, worked out by the same quote the
// website uses (calculateQuote) and applied as a difference, so nothing else about the price is recalculated behind
// staff's back (an older tour price, a discount, add-ons). Any other price is left alone: only the label changes.
export function planStyleChange(i: StyleInput): StylePlan {
  if (!i.isTourOrder) return { ok: false, why: "Only a tour order is private or shared." };
  if (i.onGroupTour && i.toPrivate) return { ok: false, why: "This order travels on a group tour, which is a shared departure. Take the order off the group first to make it private." };
  if (i.toPrivate === i.isPrivate) return { ok: true, same: true };
  if (!i.tour.custom) {
    if (i.toPrivate && !i.tour.isPrivateAvailable) return { ok: false, why: `"${i.tour.title}" is not offered as a private tour. Allow private bookings on the tour first, or keep this order shared.` };
    if (!i.toPrivate && !i.tour.isGroupAvailable) return { ok: false, why: `"${i.tour.title}" is a private-only tour, so this order can't be shared.` };
  }
  const o = i.order;
  if (i.basis !== "TOUR" || !(o.total > 0)) return { ok: true, same: false, reprice: null, note: o.total > 0 ? BASIS_NOTE[i.basis] : "This order has no price yet, so only the style changes." };
  const quote = (isPrivate: boolean) => calculateQuote({ tour: i.tour, adults: o.adults, children: o.children, infants: o.infants, isPrivate, addons: o.addons.map((a) => ({ id: "", price: a.price, unit: a.unit })), coupon: o.coupon, payMode: "FULL" });
  const from = quote(i.isPrivate), to = quote(i.toPrivate);
  const subtotal = r2(Math.max(0, o.subtotal + (to.subtotal - from.subtotal)));
  const discount = r2(Math.min(subtotal, Math.max(0, o.discount + (to.discount - from.discount))));
  const total = r2(subtotal - discount);
  if (Math.abs(total - o.total) < 0.005) return { ok: true, same: false, reprice: null, note: BASIS_NOTE.TOUR };
  if (i.cancelled) return { ok: false, why: "This order is cancelled. Reopen it before changing its style, because that changes its price." };
  // The deposit keeps the share of the price it had (the same rule as every other price change).
  const deposit = o.payMode === "FULL" ? total : o.payMode === "PAY_LATER" ? 0 : o.total > 0 && o.deposit > 0 ? r2(Math.min(total, (o.deposit / o.total) * total)) : r2((total * DEPOSIT_PERCENT) / 100);
  return { ok: true, same: false, reprice: { subtotal, discount, total, deposit }, note: i.toPrivate ? "The tour's private upgrade is added." : "The tour's private upgrade is taken off." };
}

// ---------- 3. Pickup and meeting point ----------
// Where and when the guests are met. The place, its notes and the time belong to the order. The meeting point and the
// pickup details start as the tour's own text and can be replaced for one order: order's text, else the tour's, else nothing.
// (null on the order means "use the tour's text"; an empty text means "show nothing for this order".)
export type PickupOrder = { hotel?: string | null; pickupLocation?: string | null; pickupTime?: string | null; meetingPoint?: string | null; pickupInfo?: string | null };
export type PickupDefaults = { meetingPoint?: string | null; pickupInfo?: string | null };
export type Pickup = {
  place: string; notes: string; time: string; meetingPoint: string; details: string;
  placeLine: string;  // "Hotel, gate 2"
  summary: string;    // "08:00 · Hotel, gate 2": the one-line form used on the invoice and the tracking page
  own: { meetingPoint: boolean; details: boolean }; // true where this order has its own text instead of the tour's
};
const t = (v?: string | null) => (v ?? "").trim();
export function resolvePickup(o: PickupOrder, tour: PickupDefaults = {}): Pickup {
  const place = t(o.hotel), notes = t(o.pickupLocation), time = t(o.pickupTime);
  const placeLine = [place, notes].filter(Boolean).join(", ");
  return {
    place, notes, time, placeLine, summary: [time, placeLine].filter(Boolean).join(" · "),
    meetingPoint: o.meetingPoint != null ? t(o.meetingPoint) : t(tour.meetingPoint),
    details: o.pickupInfo != null ? t(o.pickupInfo) : t(tour.pickupInfo),
    own: { meetingPoint: o.meetingPoint != null, details: o.pickupInfo != null },
  };
}
// The same resolver for an order as the order window holds it (the admin's Order object).
export type PickupCarrier = { hotel: string; pickupNotes: string; ops: { pickupTime: string }; pickup: { meetingPoint: string | null; details: string | null; defaults: { meetingPoint: string; details: string } } };
export const orderPickup = (o: PickupCarrier): Pickup => resolvePickup({ hotel: o.hotel, pickupLocation: o.pickupNotes, pickupTime: o.ops.pickupTime, meetingPoint: o.pickup.meetingPoint, pickupInfo: o.pickup.details }, { meetingPoint: o.pickup.defaults.meetingPoint, pickupInfo: o.pickup.defaults.details });
// What to store for an order's own text: nothing (null) while it is the tour's text, so a later edit of the tour still reaches this order.
export function pickupOverride(input: string | null | undefined, tourDefault?: string | null): string | null {
  if (input == null) return null;
  return t(input) === t(tourDefault) ? null : t(input);
}
// A pickup time as staff type it: "8:00", "08.30", "8 am", "7:45pm", or a window "08:00-08:30". Stored as 24-hour HH:MM.
const oneTime = (raw: string): string | null => {
  const m = /^(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm)?$/i.exec(raw.trim()); if (!m || (m[2] === undefined && !m[3])) return null;
  let h = Number(m[1]); const min = Number(m[2] ?? "0"); const ap = (m[3] ?? "").toLowerCase();
  if (ap) { if (h < 1 || h > 12) return null; if (ap === "pm" && h < 12) h += 12; if (ap === "am" && h === 12) h = 0; }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};
export const PICKUP_TIME_HELP = "Enter the pickup time like 08:00, or a window like 08:00-08:30.";
export function parsePickupTime(raw: unknown): { ok: true; value: string } | { ok: false } {
  const v = String(raw ?? "").trim(); if (!v) return { ok: true, value: "" };
  const parts = v.split(/\s*(?:-|–|—|\bto\b)\s*/i);
  if (parts.length > 2) return { ok: false };
  const out = parts.map(oneTime); if (out.some((x) => x === null)) return { ok: false };
  return { ok: true, value: out.join("-") };
}

// ---------- 4. Money on the guide sheet ----------
// A guide sheet never shows what the trip costs or what was paid. The one exception is deliberate: an amount the office
// asks the guide to collect on the day, typed in by staff for that order.
export function parseCollect(amountRaw: unknown, noteRaw: unknown): { ok: true; amount: number | null; note: string } | { ok: false; message: string } {
  const note = String(noteRaw ?? "").trim(); if (note.length > 200) return { ok: false, message: "Keep the note for the guide under 200 letters." };
  const a = String(amountRaw ?? "").replace(/,/g, "").trim(); if (a === "") return { ok: true, amount: null, note };
  const n = Number(a); if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return { ok: false, message: "Enter the amount the guide collects as a number, or leave it empty." };
  return { ok: true, amount: n > 0 ? r2(n) : null, note };
}
const fmt = (n: number, currency: string) => { try { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(n); } catch { return `${n.toFixed(2)} ${currency}`; } };
// "$50.00 (cash, for the camel ride)", or just the note, or nothing at all.
export function collectLine(amount: number | null | undefined, note: string | null | undefined, currency: string): string {
  const n = t(note); const a = amount != null && amount > 0 ? fmt(amount, currency) : "";
  return a && n ? `${a} (${n})` : a || n;
}
