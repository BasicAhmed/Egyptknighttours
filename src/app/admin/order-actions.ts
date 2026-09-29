"use server";
import { db, schema as s } from "@/db";
import { and, eq, ne } from "drizzle-orm";
import { findCustomer } from "@/lib/customers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { loadOrder, type Order } from "@/lib/orders";
import { createInvoiceDocument, createItineraryDocument, emailDocument, markDocumentSent, recordPayment, setBookingStatus, voidPayment } from "@/lib/documents";
import { createItineraryRecord, canLinkBooking } from "@/lib/itineraries";
import { newBookingRef } from "@/lib/booking";
import { syncTravelers } from "@/lib/travelers";
import { encryptText } from "@/lib/crypto";
import { BOOKING_STATUS } from "@/lib/validation";

type R = { ok: boolean; message: string; order?: Order | null; id?: string; warn?: boolean };
const audit = (userId: string, action: string, entity: string, entityId?: string) => db.insert(s.auditLogs).values({ userId, action, entity, entityId });
const done = async (id: string, message: string, ok = true, warn = false): Promise<R> => ({ ok, warn, message, order: await loadOrder(id) });
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : NaN; };

export async function orderSetStatus(id: string, status: string): Promise<R> {
  const u = await requireStaff("bookings");
  if (!(BOOKING_STATUS as readonly string[]).includes(status)) return { ok: false, message: "Invalid status" };
  await setBookingStatus(id, status); await audit(u.uid, "STATUS", "booking", id);
  return done(id, "Status updated");
}
export async function orderAddPayment(id: string, input: { amount: number; method: string; note?: string }): Promise<R> {
  const u = await requireStaff("bookings");
  const amount = num(input.amount);
  if (!(amount > 0) || amount > 1_000_000) return { ok: false, message: "Enter a payment amount above zero" };
  const r = await recordPayment(id, u.uid, { amount, method: String(input.method ?? "").slice(0, 60), note: String(input.note ?? "").slice(0, 200) });
  await audit(u.uid, "PAYMENT", "booking", id);
  return done(id, r.next === "PAID" ? "Payment recorded. Order is fully paid." : "Partial payment recorded.");
}
export async function orderRemovePayment(id: string, paymentId: string): Promise<R> {
  const u = await requireStaff("bookings");
  const r = await voidPayment(id, paymentId, u.name || u.email); if (!r) return { ok: false, message: "That payment was already removed." };
  await audit(u.uid, "VOID_PAYMENT", "booking", id);
  return done(id, "Payment removed. The order's balance and status were updated.");
}
export async function orderAddNote(id: string, text: string): Promise<R> {
  const u = await requireStaff();
  const t = String(text ?? "").trim().slice(0, 1000); if (!t) return { ok: false, message: "Write a note first" };
  await db.insert(s.bookingEvents).values({ bookingId: id, type: "NOTE", note: `${u.name}: ${t}` });
  return done(id, "Note added");
}
export async function orderCreateInvoice(id: string, o: { dueNow?: number; deadline?: string; currency?: string; extras?: string; notes?: string; status?: string; sendNow?: boolean }): Promise<R> {
  const u = await requireStaff("documents");
  const extras = String(o.extras ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [label, amt] = l.split("|"); return { label: (label ?? "").trim(), amount: Number((amt ?? "").replace(/[^0-9.\-]/g, "")) }; }).filter((e) => e.label && Number.isFinite(e.amount));
  const status = o.status && o.status !== "AUTO" && o.status !== "KEEP" && !(BOOKING_STATUS as readonly string[]).includes(o.status) ? "AUTO" : (o.status ?? "AUTO");
  const dueNow = num(o.dueNow);
  const doc = await createInvoiceDocument(id, u.uid, { currency: o.currency?.trim() || undefined, dueNow: Number.isFinite(dueNow) && dueNow >= 0 ? dueNow : undefined, deadline: /^\d{4}-\d{2}-\d{2}$/.test(o.deadline ?? "") ? o.deadline : undefined, extras, notes: String(o.notes ?? "").slice(0, 600), status });
  await audit(u.uid, "CREATE", "invoice", doc.id);
  if (o.sendNow) { const r = await emailDocument(doc.id, u.uid); return done(id, r.ok ? `Invoice ${doc.number} created and emailed. ${r.message}` : `Invoice ${doc.number} created, but the email wasn't sent: ${r.message} Use Send on WhatsApp or Download instead.`, true, !r.ok); }
  return done(id, `Invoice ${doc.number} created`);
}
export async function orderEmailDoc(id: string, docId: string, to?: string): Promise<R> {
  const u = await requireStaff("documents");
  if (to && !z.string().email().safeParse(to).success) return { ok: false, message: "That email address isn't valid" };
  const r = await emailDocument(docId, u.uid, to || undefined); await audit(u.uid, "EMAIL", "document", docId);
  return done(id, r.ok ? r.message : `${r.message} Use Send on WhatsApp or Download instead.`, r.ok);
}
export async function orderMarkSent(id: string, docId: string, via: string): Promise<R> {
  const u = await requireStaff("documents"); await markDocumentSent(docId, u.uid, via === "WHATSAPP" ? "WHATSAPP" : "MANUAL");
  return done(id, "Marked as sent to the customer");
}
export async function orderCreateItinerary(id: string, templateId: string, name: string): Promise<R> {
  const u = await requireStaff("itineraries");
  const check = await canLinkBooking(id); if (!check.ok) return { ok: false, message: check.message };
  const it = await createItineraryRecord({ templateId, bookingId: id, name, userId: u.uid, intent: "customer" }); await audit(u.uid, "CREATE", "itinerary", it.id);
  return { ...(await done(id, "Itinerary created. Open it to customize.")), id: it.id };
}
export async function orderItineraryPdf(id: string, itineraryId: string, sendNow: boolean): Promise<R> {
  const u = await requireStaff("itineraries");
  const doc = await createItineraryDocument(itineraryId, u.uid); await audit(u.uid, "CREATE", "itinerary_pdf", doc.id);
  if (sendNow) { const r = await emailDocument(doc.id, u.uid); return done(id, r.ok ? `Itinerary PDF created and emailed. ${r.message}` : `Itinerary PDF created, but the email wasn't sent: ${r.message}`, true, !r.ok); }
  return done(id, `Itinerary PDF ${doc.number} created`);
}
const editSchema = z.object({ travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), adults: z.coerce.number().int().min(1).max(200), children: z.coerce.number().int().min(0).max(200), infants: z.coerce.number().int().min(0).max(50), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/), hotel: z.string().trim().max(200), pickupNotes: z.string().trim().max(300), requests: z.string().trim().max(1000), titleOverride: z.string().trim().max(160) });
export async function orderUpdate(id: string, input: Record<string, unknown>): Promise<R> {
  const u = await requireStaff("bookings");
  const p = editSchema.safeParse(input); if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, id)); if (!b) return { ok: false, message: "Order not found" };
  const d = p.data;
  // Price is never edited here — only an itinerary's cost and profit margin can change what this order is worth.
  await db.update(s.bookings).set({ travelDate: d.travelDate, adults: d.adults, children: d.children, infants: d.infants, currency: d.currency, hotel: d.hotel || null, pickupLocation: d.pickupNotes || null, specialRequests: d.requests || null, titleOverride: d.titleOverride || null }).where(eq(s.bookings.id, id));
  await syncTravelers(id);
  await db.insert(s.bookingEvents).values({ bookingId: id, type: "NOTE", note: `${u.name}: Order details edited` });
  await audit(u.uid, "UPDATE", "booking", id); revalidatePath("/admin");
  return done(id, "Order updated");
}

// No price is entered when creating an order. Every order's price comes from its itinerary's cost and profit margin, entered afterwards — so an
// order is never accidentally priced by hand, and there is always one clear answer to "how much does this cost and how much profit is on it".
// Staff often have only one way to reach a customer when the order comes in: email OR WhatsApp/phone is required, not both.
const optEmail = z.string().trim().max(200).refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email or leave it empty").optional().default("");
const optPhone = z.string().trim().max(30).refine((v) => v === "" || v.replace(/\D/g, "").length >= 5, "Enter a valid number or leave it empty").optional().default("");
const newSchema = z.object({
  source: z.enum(["WHATSAPP", "EMAIL", "PHONE", "VIATOR"]),
  // A Viator booking is already paid in full through Viator, so it's entered as a settled total up front rather than priced later via an itinerary.
  viatorTotal: z.coerce.number().min(0).max(10_000_000).optional().nullable(),
  name: z.string().trim().min(2).max(120), email: optEmail, whatsapp: optPhone, country: z.string().trim().max(80).optional().default(""), nationality: z.string().trim().max(60).optional().default(""),
  tourId: z.string().min(1).max(60), customTitle: z.string().trim().max(160).optional().default(""), travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(200), children: z.coerce.number().int().min(0).max(200), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  hotel: z.string().trim().max(200).optional().default(""), notes: z.string().trim().max(1000).optional().default(""),
});
async function ensureCustomTour() {
  const [ex] = await db.select().from(s.tours).where(eq(s.tours.slug, "custom-experience")); if (ex) return ex.id;
  const [d] = await db.select().from(s.destinations).limit(1);
  const [t] = await db.insert(s.tours).values({ slug: "custom-experience", title: "Custom experience", shortDescription: "Created by staff for a specific customer.", longDescription: "Custom experience created by staff.", destinationId: d.id, category: "MULTI_DAY", price: 0, status: "ARCHIVED", isPrivateAvailable: true }).returning();
  return t.id;
}
// Customer card edit: fix or add the email / WhatsApp later. Still needs at least one; an email already used by another customer is refused.
// Customer card edit: every detail can be corrected after the order is made. Email or WhatsApp — at least one stays required;
// an email already used by another customer is refused. The name is THIS order's guest name (two orders can share an email but be
// different people), so renaming here never renames the customer's other orders. Contact, nationality and country are the customer's own
// details and update everywhere.
const custSchema = z.object({ name: z.string().trim().min(2, "Enter the customer's name").max(120), email: optEmail, whatsapp: optPhone, phone: optPhone,
  nationality: z.string().trim().max(60).optional().default(""), country: z.string().trim().max(80).optional().default("") });
export async function orderUpdateCustomer(id: string, input: Record<string, unknown>): Promise<R> {
  const u = await requireStaff("bookings");
  const p = custSchema.safeParse(input); if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const d = p.data; const email = d.email.toLowerCase(), wa = d.whatsapp, phone = d.phone || d.whatsapp;
  if (!email && !wa && !phone) return { ok: false, message: "Keep at least one: email or WhatsApp number." };
  const [b] = await db.select({ customerId: s.bookings.customerId, guestName: s.bookings.guestName, cname: s.customers.name }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.bookings.id, id));
  if (!b) return { ok: false, message: "Order not found" };
  if (email) { const [other] = await db.select({ id: s.customers.id, name: s.customers.name }).from(s.customers).where(and(eq(s.customers.email, email), ne(s.customers.id, b.customerId))); if (other) return { ok: false, message: `That email already belongs to another customer (${other.name}).` }; }
  const oldName = b.guestName || b.cname;
  const [cur] = await db.select({ nationality: s.customers.nationality }).from(s.customers).where(eq(s.customers.id, b.customerId));
  await db.transaction(async (tx) => {
    await tx.update(s.customers).set({ email: email || null, whatsapp: wa || null, phone: phone || null, nationality: d.nationality || null, country: d.country || null }).where(eq(s.customers.id, b.customerId));
    if (d.name !== oldName) {
      await tx.update(s.bookings).set({ guestName: d.name }).where(eq(s.bookings.id, id));
      // Keep the lead traveler in step when they were simply the same person under the old spelling.
      await tx.update(s.travelers).set({ fullName: d.name }).where(and(eq(s.travelers.bookingId, id), eq(s.travelers.fullName, oldName)));
      await tx.insert(s.bookingEvents).values({ bookingId: id, type: "NOTE", note: `Customer name changed from "${oldName}" to "${d.name}"` });
    }
    // Lead traveler's nationality follows the customer's when it was just a copy of it (or empty); a nationality staff typed from a passport is left alone.
    if ((d.nationality || null) !== (cur?.nationality ?? null) && d.nationality) {
      const lead = await tx.select({ id: s.travelers.id, nat: s.travelers.nationality }).from(s.travelers).where(and(eq(s.travelers.bookingId, id), eq(s.travelers.fullName, d.name)));
      for (const t of lead) if (!t.nat || t.nat === cur?.nationality) await tx.update(s.travelers).set({ nationality: d.nationality }).where(eq(s.travelers.id, t.id));
    }
  });
  await audit(u.uid, "UPDATE", "customer", b.customerId);
  return done(id, "Customer details saved");
}

// Orders that come in by WhatsApp or phone: staff enter them here and the rest of the flow (invoice, payment, itinerary) is identical.
export async function orderCreate(input: Record<string, unknown>): Promise<R> {
  const u = await requireStaff("bookings");
  const p = newSchema.safeParse(input); if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const d = p.data; const email = d.email.toLowerCase();
  if (!email && !d.whatsapp) return { ok: false, message: "Enter the customer's email or WhatsApp number (at least one)." };
  const custom = d.tourId === "custom"; if (custom && d.customTitle.length < 3) return { ok: false, message: "Enter the name of the experience" };
  const tourId = custom ? await ensureCustomTour() : d.tourId;
  // A Viator booking already has the money in hand: it's entered as a settled total right away, marked paid, and skips the itinerary-pricing step
  // every other manual booking goes through — there is nothing left for the customer to pay us directly.
  const isViator = d.source === "VIATOR";
  if (isViator && (d.viatorTotal == null || d.viatorTotal <= 0)) return { ok: false, message: "Enter the total the guest paid through Viator." };
  const total = isViator ? d.viatorTotal! : 0;
  const ref = await newBookingRef();
  const id = await db.transaction(async (tx) => {
    let cust = await findCustomer(tx, email, d.whatsapp);
    // Fill in whichever contact detail the existing record was missing (e.g. first order had only a phone, this one also has an email).
    if (cust && ((!cust.email && email) || (!cust.whatsapp && d.whatsapp))) [cust] = await tx.update(s.customers).set({ email: cust.email || email || null, whatsapp: cust.whatsapp || d.whatsapp || null, phone: cust.phone || d.whatsapp || null }).where(eq(s.customers.id, cust.id)).returning();
    if (!cust) [cust] = await tx.insert(s.customers).values({ email: email || null, name: d.name, whatsapp: d.whatsapp || null, phone: d.whatsapp || null, country: d.country || d.nationality || null, nationality: d.nationality || null }).returning();
    // For every other channel: no price yet — subtotal, total, deposit and cost all start at 0, priced later via an itinerary.
    const [b] = await tx.insert(s.bookings).values({ ref, tourId, customerId: cust.id, guestName: d.name, travelDate: d.travelDate, adults: d.adults, children: d.children, infants: 0, isPrivate: true, hotel: d.hotel || null, specialRequests: d.notes || null, subtotal: total, discount: 0, total, costTotal: null, deposit: total, payMode: "DEPOSIT", currency: d.currency, source: d.source, status: isViator ? "PAID" : "PENDING", titleOverride: custom ? d.customTitle : null }).returning();
    if (isViator) await tx.insert(s.payments).values({ bookingId: b.id, provider: "VIATOR", kind: "PAYMENT", amount: total, status: "PAID", providerRef: "Paid in full through Viator" });
    await tx.insert(s.travelers).values([{ bookingId: b.id, fullName: d.name, type: "ADULT", nationality: d.nationality || null }]);
    await tx.insert(s.bookingEvents).values({ bookingId: b.id, type: "CREATED" });
    return b.id;
  });
  await syncTravelers(id); await audit(u.uid, "CREATE", "booking", id); revalidatePath("/admin");
  const { notifyStaffNewOrder } = await import("@/lib/notifications"); await notifyStaffNewOrder(id);
  return { ...(await done(id, `Order ${ref} created`)), id };
}

// ---------- Travelers, passports and operations ----------
const dateOrEmpty = z.string().trim().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date");
const travSchema = z.object({ name: z.string().trim().min(1).max(120), type: z.enum(["ADULT", "CHILD", "INFANT"]), age: z.union([z.literal(""), z.coerce.number().int().min(0).max(120)]).optional(), nationality: z.string().trim().max(60), dob: dateOrEmpty, passportNumber: z.string().trim().max(30), passportExpiry: dateOrEmpty, notes: z.string().trim().max(300) });
export async function orderSaveTraveler(id: string, travelerId: string, input: Record<string, unknown>): Promise<R> {
  const u = await requireStaff("bookings");
  const p = travSchema.safeParse(input); if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const d = p.data;
  await db.update(s.travelers).set({ fullName: d.name, type: d.type, age: d.age === "" || d.age === undefined ? null : Number(d.age), nationality: d.nationality || null, dob: d.dob || null, passportNumber: d.passportNumber ? encryptText(d.passportNumber) : null, passportExpiry: d.passportExpiry || null, notes: d.notes || null }).where(and(eq(s.travelers.id, travelerId), eq(s.travelers.bookingId, id)));
  await audit(u.uid, "UPDATE", "traveler", travelerId);
  return done(id, "Traveler saved");
}
export async function orderAddTraveler(id: string, type: string): Promise<R> {
  const u = await requireStaff("bookings"); if (!["ADULT", "CHILD", "INFANT"].includes(type)) return { ok: false, message: "Invalid type" };
  const n = (await db.select({ id: s.travelers.id }).from(s.travelers).where(eq(s.travelers.bookingId, id))).length + 1;
  const col = type === "ADULT" ? "adults" : type === "CHILD" ? "children" : "infants";
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, id)); if (!b) return { ok: false, message: "Order not found" };
  await db.insert(s.travelers).values({ bookingId: id, fullName: `Traveler ${n}`, type });
  await db.update(s.bookings).set({ [col]: (b as unknown as Record<string, number>)[col] + 1 }).where(eq(s.bookings.id, id));
  await audit(u.uid, "CREATE", "traveler", id); return done(id, "Traveler added");
}
export async function orderDeleteTraveler(id: string, travelerId: string): Promise<R> {
  const u = await requireStaff("bookings");
  const [t] = await db.select().from(s.travelers).where(and(eq(s.travelers.id, travelerId), eq(s.travelers.bookingId, id))); if (!t) return { ok: false, message: "Traveler not found" };
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, id));
  await db.delete(s.travelerFiles).where(eq(s.travelerFiles.travelerId, travelerId)); await db.delete(s.travelers).where(eq(s.travelers.id, travelerId));
  const col = t.type === "ADULT" ? "adults" : t.type === "CHILD" ? "children" : "infants";
  if (b) await db.update(s.bookings).set({ [col]: Math.max(t.type === "ADULT" ? 1 : 0, (b as unknown as Record<string, number>)[col] - 1) }).where(eq(s.bookings.id, id));
  await audit(u.uid, "DELETE", "traveler", travelerId); return done(id, "Traveler removed (and their uploaded files)");
}
export async function orderSyncTravelers(id: string): Promise<R> { await requireStaff("bookings"); await syncTravelers(id); return done(id, ""); }
const opsSchema = z.object({ guideNotes: z.string().trim().max(1000), preferredLanguage: z.string().trim().max(40), guideId: z.string().trim().max(60), driver: z.string().trim().max(120), vehicle: z.string().trim().max(120), flightArrival: z.string().trim().max(160), flightDeparture: z.string().trim().max(160), roomType: z.string().trim().max(80), pickupTime: z.string().trim().max(40), occasion: z.string().trim().max(60), emergencyContact: z.string().trim().max(160), visaStatus: z.string().trim().max(40), dietary: z.string().trim().max(300), accessibility: z.string().trim().max(300), hotel: z.string().trim().max(200), requests: z.string().trim().max(1000) });
export async function orderSaveOps(id: string, input: Record<string, unknown>): Promise<R> {
  const u = await requireStaff("bookings");
  const p = opsSchema.safeParse(input); if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const d = p.data;
  if (d.guideId) { const [g] = await db.select({ id: s.tourGuides.id }).from(s.tourGuides).where(eq(s.tourGuides.id, d.guideId)); if (!g) return { ok: false, message: "That guide no longer exists" }; }
  const [before] = await db.select({ guideId: s.bookings.guideId }).from(s.bookings).where(eq(s.bookings.id, id));
  await db.update(s.bookings).set({ guideNotes: d.guideNotes || null, preferredLanguage: d.preferredLanguage || null, guideId: d.guideId || null, driver: d.driver || null, vehicle: d.vehicle || null, flightArrival: d.flightArrival || null, flightDeparture: d.flightDeparture || null, roomType: d.roomType || null, pickupTime: d.pickupTime || null, occasion: d.occasion || null, emergencyContact: d.emergencyContact || null, visaStatus: d.visaStatus || null, dietary: d.dietary || null, accessibility: d.accessibility || null, hotel: d.hotel || null, specialRequests: d.requests || null }).where(eq(s.bookings.id, id));
  if ((before?.guideId ?? "") !== d.guideId) { const [g] = d.guideId ? await db.select().from(s.tourGuides).where(eq(s.tourGuides.id, d.guideId)) : []; await db.insert(s.bookingEvents).values({ bookingId: id, type: "NOTE", note: `${u.name}: ${g ? `Guide assigned: ${g.name}` : "Guide unassigned"}` }); }
  await audit(u.uid, "UPDATE", "booking_ops", id); return done(id, "Operations details saved");
}
