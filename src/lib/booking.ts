import { db, schema as s } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { calculateQuote, type Quote } from "./pricing";
import { z } from "zod";
import { quoteSchema, bookingSchema } from "./validation";
import { signRef } from "./booking-token";

export class BookingError extends Error {}
type QuoteIn = z.infer<typeof quoteSchema>;

export async function buildQuote(input: QuoteIn, opts: { travelDate?: string; customerEmail?: string } = {}) {
  const [tour] = await db.select().from(s.tours).where(and(eq(s.tours.slug, input.tourSlug), eq(s.tours.status, "PUBLISHED")));
  if (!tour) throw new BookingError("Tour not found");
  const people = input.adults + input.children;
  if (tour.pricingModel === "PER_PERSON" && people > tour.maxTravelers) throw new BookingError(`Max ${tour.maxTravelers} travelers per booking. Message us for bigger groups.`);
  if (input.isPrivate && !tour.isPrivateAvailable) throw new BookingError("Private option not available for this tour");
  if (!input.isPrivate && !tour.isGroupAvailable) throw new BookingError("This tour is private only");
  if (input.infants > input.adults) throw new BookingError("Each infant needs an adult");
  if (opts.travelDate) {
    const todayUTC = new Date().toISOString().slice(0, 10);
    const days = (new Date(opts.travelDate + "T00:00:00Z").getTime() - new Date(todayUTC + "T00:00:00Z").getTime()) / 86400000;
    if (Number.isNaN(days) || opts.travelDate < todayUTC) throw new BookingError("Please choose a future date");
    if (days > 730) throw new BookingError("Date is too far ahead");
    if (input.payMode === "PAY_LATER" && days < 7) throw new BookingError("Pay-later is only available 7+ days before travel");
  }
  const allAddons = await db.select().from(s.addons).where(and(eq(s.addons.tourId, tour.id), eq(s.addons.active, true)));
  const chosen = allAddons.filter((a) => input.addonIds.includes(a.id));

  let coupon: typeof s.coupons.$inferSelect | null = null;
  let couponMessage: string | null = null;
  if (input.couponCode?.trim()) {
    const [c] = await db.select().from(s.coupons).where(eq(s.coupons.code, input.couponCode.trim().toUpperCase()));
    if (!c || !c.active) couponMessage = "Coupon not valid";
    else if (c.expiresAt && c.expiresAt.getTime() < Date.now()) couponMessage = "Coupon expired";
    else if (c.maxUses != null && c.usedCount >= c.maxUses) couponMessage = "Coupon fully used";
    else if (c.tourId && c.tourId !== tour.id) couponMessage = "Coupon doesn't apply to this tour";
    else if (c.firstBookingOnly && opts.customerEmail) {
      const prior = await db.select({ n: sql<number>`count(*)` }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.customers.email, opts.customerEmail.toLowerCase()));
      if (prior[0].n > 0) couponMessage = "This coupon is for first bookings only"; else coupon = c;
    } else coupon = c;
  }
  const quote: Quote = calculateQuote({
    tour, adults: input.adults, children: input.children, infants: input.infants, isPrivate: input.isPrivate,
    addons: chosen.map((a) => ({ id: a.id, price: a.price, unit: a.unit })),
    coupon: coupon ? { type: coupon.type, value: coupon.value, minSubtotal: coupon.minSubtotal } : null, payMode: input.payMode,
  });
  if (coupon && quote.discount === 0) couponMessage = `Coupon needs a minimum of $${coupon.minSubtotal}`;
  return { tour, chosen, coupon: quote.discount > 0 ? coupon : null, couponMessage, quote };
}

export async function createBooking(input: z.infer<typeof bookingSchema>) {
  const email = input.email.toLowerCase();
  const { tour, chosen, coupon, couponMessage, quote } = await buildQuote(input, { travelDate: input.travelDate, customerEmail: email });
  if (input.couponCode && !coupon) throw new BookingError(couponMessage ?? "Coupon not valid");

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const gen = () => "EK-" + Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => alphabet[b % 32]).join("");
  let ref = gen();
  for (let i = 0; i < 6; i++) { if (!(await db.select({ id: s.bookings.id }).from(s.bookings).where(eq(s.bookings.ref, ref))).length) break; ref = gen(); }
  const token = signRef(ref); // fail early if AUTH_SECRET is missing
  return await db.transaction(async (tx) => {
    let [cust] = await tx.select().from(s.customers).where(eq(s.customers.email, email));
    if (!cust) [cust] = await tx.insert(s.customers).values({ email, name: input.name, whatsapp: input.whatsapp, phone: input.whatsapp, country: input.country ?? null }).returning();
    else await tx.update(s.customers).set({ name: input.name, whatsapp: input.whatsapp, country: input.country ?? cust.country }).where(eq(s.customers.id, cust.id));

    const [b] = await tx.insert(s.bookings).values({
      ref, tourId: tour.id, customerId: cust.id, travelDate: input.travelDate, adults: input.adults, children: input.children, infants: input.infants,
      isPrivate: input.isPrivate, hotel: input.hotel ?? null, pickupLocation: input.pickupLocation ?? null, specialRequests: input.specialRequests ?? null,
      dietary: input.dietary ?? null, accessibility: input.accessibility ?? null,
      addonsJson: JSON.stringify(chosen.map((a) => ({ id: a.id, name: a.name, price: a.price, unit: a.unit }))),
      subtotal: quote.subtotal, discount: quote.discount, total: quote.total, deposit: quote.deposit, payMode: input.payMode,
      couponId: coupon?.id ?? null, source: input.source ?? null, status: "PENDING",
    }).returning();

    const names = input.travelerNames ?? [];
    const rows: { bookingId: string; fullName: string; type: string }[] = [];
    let n = 0;
    for (const [type, count] of [["ADULT", input.adults], ["CHILD", input.children], ["INFANT", input.infants]] as const)
      for (let i = 0; i < count; i++) rows.push({ bookingId: b.id, fullName: names[n++]?.trim() || (n === 1 ? input.name : `Traveler ${n}`), type });
    if (rows.length) await tx.insert(s.travelers).values(rows);

    if (quote.deposit > 0) await tx.insert(s.payments).values({ bookingId: b.id, kind: input.payMode === "FULL" ? "FULL" : "DEPOSIT", amount: quote.deposit, provider: "MANUAL", status: "PENDING" });
    if (coupon) await tx.update(s.coupons).set({ usedCount: sql`${s.coupons.usedCount} + 1` }).where(eq(s.coupons.id, coupon.id));
    await tx.update(s.tours).set({ popularity: sql`${s.tours.popularity} + 1` }).where(eq(s.tours.id, tour.id));

    await tx.insert(s.bookingEvents).values({ bookingId: b.id, type: "CREATED" });
    const leadValues = {
      name: input.name, email, whatsapp: input.whatsapp, country: input.country ?? null, kind: "INQUIRY", status: "BOOKED", source: input.source ?? "website-booking",
      travelDates: input.travelDate, travelers: input.adults + input.children + input.infants, toursViewed: tour.slug, customerId: cust.id,
      consentMarketing: !!input.consentMarketing, lastContactAt: new Date(), nextFollowUpAt: null,
    };
    // If they abandoned this checkout earlier, turn that lead into the booked one instead of creating a duplicate.
    const [prior] = await tx.select().from(s.leads).where(and(eq(s.leads.email, email), eq(s.leads.status, "ABANDONED")));
    let leadId: string;
    if (prior) { await tx.update(s.leads).set(leadValues).where(eq(s.leads.id, prior.id)); leadId = prior.id; }
    else { const [l] = await tx.insert(s.leads).values(leadValues).returning(); leadId = l.id; }
    await tx.insert(s.leadEvents).values({ leadId, type: "BOOKING_CREATED", note: `${ref} · ${tour.title} · $${quote.total}` });
    return { ref, token, total: quote.total, deposit: quote.deposit };
  });
}
