import { db, schema as s } from "@/db";
import { and, eq, isNotNull } from "drizzle-orm";
import { money, parseJson } from "./format";
import { isPrepaid, planStyleChange, styleLabel, type StyleBasis, type StylePlan } from "./order-rules";
import { setBookingStatus } from "./documents";

type Booking = typeof s.bookings.$inferSelect; type Tour = typeof s.tours.$inferSelect;

// Where this order's price comes from, which decides whether changing private/shared moves it:
// paid through a marketplace (never), set by its itinerary's cost and margin (never), or taken from the tour's own
// price list when the customer booked on the website (moves by the tour's private upgrade).
async function styleBasis(b: Booking): Promise<StyleBasis> {
  if (isPrepaid(b.source)) return "PREPAID";
  const [it] = await db.select({ id: s.itineraries.id }).from(s.itineraries).where(and(eq(s.itineraries.bookingId, b.id), isNotNull(s.itineraries.costPrice), isNotNull(s.itineraries.marginPercent))).limit(1);
  if (it) return "ITINERARY";
  return (b.source ?? "WEBSITE") === "WEBSITE" ? "TOUR" : "MANUAL";
}
export async function styleChangePlan(b: Booking, tour: Tour, toPrivate: boolean): Promise<StylePlan> {
  const [coupon] = b.couponId ? await db.select().from(s.coupons).where(eq(s.coupons.id, b.couponId)) : [];
  return planStyleChange({
    toPrivate, isPrivate: b.isPrivate, isTourOrder: true, onGroupTour: false, cancelled: b.status === "CANCELLED", basis: await styleBasis(b),
    tour: { ...tour, custom: tour.slug === "custom-experience" },
    order: { adults: b.adults, children: b.children, infants: b.infants, subtotal: b.subtotal, discount: b.discount, total: b.total, deposit: b.deposit, payMode: b.payMode, addons: parseJson<{ price: number; unit: string }[]>(b.addonsJson, []), coupon: coupon ? { type: coupon.type, value: coupon.value, minSubtotal: coupon.minSubtotal } : null },
  });
}
// What the order window shows next to "Style": what switching to the other style would do, before anyone taps it.
export type StyleSwitch = { toPrivate: boolean; ok: boolean; why: string; newTotal: number | null; note: string };
export async function styleSwitchFor(b: Booking, tour: Tour): Promise<StyleSwitch> {
  const p = await styleChangePlan(b, tour, !b.isPrivate);
  if (!p.ok) return { toPrivate: !b.isPrivate, ok: false, why: p.why, newTotal: null, note: "" };
  return { toPrivate: !b.isPrivate, ok: true, why: "", newTotal: !p.same && p.reprice ? p.reprice.total : null, note: p.same ? "" : p.note };
}

// Changes an order between private and shared. Everything that shows the style reads it from the order, so the order
// window, the lists, the guide sheet, the tracking page and every NEW invoice follow at once (documents already created
// are snapshots and keep what they said). When the price moves with it, the status follows the money that is recorded,
// by the same rule as removing a payment: paid in full, partly paid, or back to awaiting payment.
export async function changeOrderStyle(id: string, toPrivate: boolean, by: { name: string }): Promise<{ ok: boolean; message: string; warn?: boolean; changed?: boolean }> {
  const [r] = await db.select({ b: s.bookings, tour: s.tours }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.id, String(id ?? "")));
  if (!r) return { ok: false, message: "That order no longer exists." };
  const { b, tour } = r; const p = await styleChangePlan(b, tour, toPrivate);
  if (!p.ok) return { ok: false, message: p.why };
  if (p.same) return { ok: true, message: `This order is already ${styleLabel(toPrivate).toLowerCase()}.` };
  const from = styleLabel(b.isPrivate), to = styleLabel(toPrivate);
  // Written only if the order still has the old style at this moment, so two taps (or two people) change it once and log it once.
  const done = await db.update(s.bookings).set({ isPrivate: toPrivate, ...(p.reprice ?? {}) }).where(and(eq(s.bookings.id, b.id), eq(s.bookings.isPrivate, b.isPrivate))).returning({ id: s.bookings.id });
  if (!done.length) return { ok: true, message: `This order is already ${to.toLowerCase()}.` };
  const price = p.reprice ? ` Price changed from ${money(b.total, b.currency)} to ${money(p.reprice.total, b.currency)}. ${p.note}` : ` ${p.note}`;
  await db.insert(s.bookingEvents).values({ bookingId: b.id, type: "NOTE", note: `${by.name}: Style changed from ${from} to ${to}.${price}` });
  if (!p.reprice) return { ok: true, changed: true, message: `Style changed to ${to}. ${p.note}` };
  // The deposit the website asked for and never received follows the new deposit.
  await db.update(s.payments).set({ amount: p.reprice.deposit }).where(and(eq(s.payments.bookingId, b.id), eq(s.payments.status, "PENDING")));
  const rows = await db.select({ amount: s.payments.amount }).from(s.payments).where(and(eq(s.payments.bookingId, b.id), eq(s.payments.status, "PAID")));
  const paid = Math.round(rows.reduce((a, x) => a + x.amount, 0) * 100) / 100; const total = p.reprice.total;
  const hasInvoice = (await db.select({ id: s.documents.id }).from(s.documents).where(and(eq(s.documents.bookingId, b.id), eq(s.documents.kind, "INVOICE"))).limit(1)).length > 0;
  if (["PAID", "PARTIALLY_PAID", "DEPOSIT_PAID"].includes(b.status)) {
    const next = paid >= total - 0.005 ? "PAID" : paid > 0.005 ? (b.status === "DEPOSIT_PAID" ? "DEPOSIT_PAID" : "PARTIALLY_PAID") : hasInvoice ? "INVOICED" : "PENDING";
    if (next !== b.status) await setBookingStatus(b.id, next);
  }
  const over = paid > total + 0.005;
  return { ok: true, changed: true, warn: over, message: `Style changed to ${to}. The total is now ${money(total, b.currency)} (was ${money(b.total, b.currency)}).${over ? ` ${money(Math.round((paid - total) * 100) / 100, b.currency)} more than that has already been paid: refund the difference, or remove or correct the payment.` : paid > 0.005 && paid < total - 0.005 ? ` ${money(Math.round((total - paid) * 100) / 100, b.currency)} is still to pay.` : ""}${hasInvoice ? " The invoice already made keeps the old total: create a new version for the customer." : ""}` };
}
