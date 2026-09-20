"use server";
import { db, schema as s } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { loadOrder, type Order } from "@/lib/orders";
import { createInvoiceDocument, createItineraryDocument, emailDocument, markDocumentSent, recordPayment, setBookingStatus } from "@/lib/documents";
import { createItineraryRecord } from "@/lib/itineraries";
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
  const it = await createItineraryRecord({ templateId, bookingId: id, name, userId: u.uid }); await audit(u.uid, "CREATE", "itinerary", it.id);
  return { ...(await done(id, "Itinerary created. Open it to customize.")), id: it.id };
}
export async function orderItineraryPdf(id: string, itineraryId: string, sendNow: boolean): Promise<R> {
  const u = await requireStaff("itineraries");
  const doc = await createItineraryDocument(itineraryId, u.uid); await audit(u.uid, "CREATE", "itinerary_pdf", doc.id);
  if (sendNow) { const r = await emailDocument(doc.id, u.uid); return done(id, r.ok ? `Itinerary PDF created and emailed. ${r.message}` : `Itinerary PDF created, but the email wasn't sent: ${r.message}`, true, !r.ok); }
  return done(id, `Itinerary PDF ${doc.number} created`);
}
const editSchema = z.object({ travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), adults: z.coerce.number().int().min(1).max(200), children: z.coerce.number().int().min(0).max(200), infants: z.coerce.number().int().min(0).max(50), total: z.coerce.number().min(0).max(10_000_000), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/), hotel: z.string().trim().max(200), pickupNotes: z.string().trim().max(300), requests: z.string().trim().max(1000), titleOverride: z.string().trim().max(160) });
export async function orderUpdate(id: string, input: Record<string, unknown>): Promise<R> {
  const u = await requireStaff("bookings");
  const p = editSchema.safeParse(input); if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, id)); if (!b) return { ok: false, message: "Order not found" };
  const d = p.data;
  await db.update(s.bookings).set({ travelDate: d.travelDate, adults: d.adults, children: d.children, infants: d.infants, subtotal: Math.round((d.total + b.discount) * 100) / 100, total: d.total, deposit: Math.min(b.deposit, d.total), currency: d.currency, hotel: d.hotel || null, pickupLocation: d.pickupNotes || null, specialRequests: d.requests || null, titleOverride: d.titleOverride || null }).where(eq(s.bookings.id, id));
  await syncTravelers(id);
  await db.insert(s.bookingEvents).values({ bookingId: id, type: "NOTE", note: `${u.name}: Order details edited` });
  await audit(u.uid, "UPDATE", "booking", id); revalidatePath("/admin");
  return done(id, "Order updated");
}

const newSchema = z.object({
  name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), whatsapp: z.string().trim().min(5).max(30), country: z.string().trim().max(80).optional().default(""), nationality: z.string().trim().max(60).optional().default(""),
  tourId: z.string().min(1).max(60), customTitle: z.string().trim().max(160).optional().default(""), travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(200), children: z.coerce.number().int().min(0).max(200), total: z.coerce.number().min(0).max(10_000_000), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  depositPercent: z.coerce.number().min(0).max(100), hotel: z.string().trim().max(200).optional().default(""), notes: z.string().trim().max(1000).optional().default(""),
});
async function ensureCustomTour() {
  const [ex] = await db.select().from(s.tours).where(eq(s.tours.slug, "custom-experience")); if (ex) return ex.id;
  const [d] = await db.select().from(s.destinations).limit(1);
  const [t] = await db.insert(s.tours).values({ slug: "custom-experience", title: "Custom experience", shortDescription: "Created by staff for a specific customer.", longDescription: "Custom experience created by staff.", destinationId: d.id, category: "MULTI_DAY", price: 0, status: "ARCHIVED", isPrivateAvailable: true }).returning();
  return t.id;
}
// Orders that come in by WhatsApp or phone: staff enter them here and the rest of the flow (invoice, payment, itinerary) is identical.
export async function orderCreate(input: Record<string, unknown>): Promise<R> {
  const u = await requireStaff("bookings");
  const p = newSchema.safeParse(input); if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const d = p.data; const email = d.email.toLowerCase();
  const custom = d.tourId === "custom"; if (custom && d.customTitle.length < 3) return { ok: false, message: "Enter the name of the experience" };
  const tourId = custom ? await ensureCustomTour() : d.tourId;
  const ref = await newBookingRef();
  const id = await db.transaction(async (tx) => {
    let [cust] = await tx.select().from(s.customers).where(eq(s.customers.email, email));
    if (!cust) [cust] = await tx.insert(s.customers).values({ email, name: d.name, whatsapp: d.whatsapp, phone: d.whatsapp, country: d.country || d.nationality || null, nationality: d.nationality || null }).returning();
    const [b] = await tx.insert(s.bookings).values({ ref, tourId, customerId: cust.id, travelDate: d.travelDate, adults: d.adults, children: d.children, infants: 0, isPrivate: true, hotel: d.hotel || null, specialRequests: d.notes || null, subtotal: d.total, discount: 0, total: d.total, deposit: Math.round(d.total * d.depositPercent) / 100, payMode: "DEPOSIT", currency: d.currency, source: "manual", status: "PENDING", titleOverride: custom ? d.customTitle : null }).returning();
    await tx.insert(s.travelers).values([{ bookingId: b.id, fullName: d.name, type: "ADULT", nationality: d.nationality || null }]);
    await tx.insert(s.bookingEvents).values({ bookingId: b.id, type: "CREATED" });
    return b.id;
  });
  await syncTravelers(id); await audit(u.uid, "CREATE", "booking", id); revalidatePath("/admin");
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
const opsSchema = z.object({ preferredLanguage: z.string().trim().max(40), guideId: z.string().trim().max(60), driver: z.string().trim().max(120), vehicle: z.string().trim().max(120), flightArrival: z.string().trim().max(160), flightDeparture: z.string().trim().max(160), roomType: z.string().trim().max(80), pickupTime: z.string().trim().max(40), occasion: z.string().trim().max(60), emergencyContact: z.string().trim().max(160), visaStatus: z.string().trim().max(40), dietary: z.string().trim().max(300), accessibility: z.string().trim().max(300), hotel: z.string().trim().max(200), requests: z.string().trim().max(1000) });
export async function orderSaveOps(id: string, input: Record<string, unknown>): Promise<R> {
  const u = await requireStaff("bookings");
  const p = opsSchema.safeParse(input); if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const d = p.data;
  if (d.guideId) { const [g] = await db.select({ id: s.tourGuides.id }).from(s.tourGuides).where(eq(s.tourGuides.id, d.guideId)); if (!g) return { ok: false, message: "That guide no longer exists" }; }
  const [before] = await db.select({ guideId: s.bookings.guideId }).from(s.bookings).where(eq(s.bookings.id, id));
  await db.update(s.bookings).set({ preferredLanguage: d.preferredLanguage || null, guideId: d.guideId || null, driver: d.driver || null, vehicle: d.vehicle || null, flightArrival: d.flightArrival || null, flightDeparture: d.flightDeparture || null, roomType: d.roomType || null, pickupTime: d.pickupTime || null, occasion: d.occasion || null, emergencyContact: d.emergencyContact || null, visaStatus: d.visaStatus || null, dietary: d.dietary || null, accessibility: d.accessibility || null, hotel: d.hotel || null, specialRequests: d.requests || null }).where(eq(s.bookings.id, id));
  if ((before?.guideId ?? "") !== d.guideId) { const [g] = d.guideId ? await db.select().from(s.tourGuides).where(eq(s.tourGuides.id, d.guideId)) : []; await db.insert(s.bookingEvents).values({ bookingId: id, type: "NOTE", note: `${u.name}: ${g ? `Guide assigned: ${g.name}` : "Guide unassigned"}` }); }
  await audit(u.uid, "UPDATE", "booking_ops", id); return done(id, "Operations details saved");
}
