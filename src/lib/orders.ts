import { db, schema as s } from "@/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getSettings } from "./settings";
import { signDoc } from "./booking-token";
import { parseJson } from "./format";
import { linkOrigin } from "./origin";
import { BOOKING_STATUS_LABEL } from "./validation";
import { decryptText } from "./crypto";
import { signGuide, signReview } from "./booking-token";

export type OrderRow = { id: string; ref: string; status: string; title: string; name: string; email: string; whatsapp: string; country: string; travelDate: string; pax: number; isPrivate: boolean; total: number; paid: number; currency: string; createdAt: number; invoices: number; invoiceSent: number; itineraries: number; itinerarySent: number; hotel: string; guideName: string; passports: number };
export type Activity = { at: number; kind: "created" | "status" | "payment" | "doc" | "note"; text: string };
export type OrderDoc = { id: string; kind: string; number: string; sentAt: number | null; sentTo: string | null; sentVia: string | null; amount: number | null; currency: string; createdAt: number; shareUrl: string };
export type TravelerFile = { id: string; kind: string; filename: string; mime: string; size: number; createdAt: number };
export type Traveler = { id: string; name: string; type: string; age: number | null; nationality: string; dob: string; passportNumber: string; passportExpiry: string; notes: string; files: TravelerFile[] };
export type Guide = { id: string; name: string; phone: string; languages: string; active: boolean };
export type Ops = { preferredLanguage: string; guideId: string; driver: string; vehicle: string; flightArrival: string; flightDeparture: string; roomType: string; pickupTime: string; occasion: string; emergencyContact: string; visaStatus: string; guideNotes: string };
export type Order = {
  id: string; ref: string; status: string; title: string; tourId: string; tourTitle: string; destination: string;
  customer: { name: string; email: string; whatsapp: string; phone: string; country: string; nationality: string };
  travelDate: string; adults: number; children: number; infants: number; isPrivate: boolean; hotel: string; pickupNotes: string; requests: string; dietary: string; accessibility: string;
  addons: { name: string; price: number; unit: string }[]; subtotal: number; discount: number; total: number; deposit: number; payMode: string; currency: string; paid: number; balance: number; source: string; createdAt: number; titleOverride: string;
  costTotal: number | null;
  payments: { id: string; amount: number; method: string; note: string; status: string; at: number }[];
  documents: OrderDoc[]; itineraries: { id: string; name: string; status: string }[];
  activity: Activity[]; templates: { id: string; name: string }[]; methods: string[]; defaults: { currency: string; dueNow: number; deadline: string };
  trackUrl: string; guideUrl: string; reviewUrl: string | null; companyName: string; travelers: Traveler[]; guides: Guide[]; ops: Ops;
};

// One query for the whole list. Payment and document counts are computed inside it, so the page needs a single round trip.
export async function listOrders(limit = 300): Promise<OrderRow[]> {
  const rows = await db.select({
    b: s.bookings, tour: s.tours.title, c: s.customers,
    paid: sql<number>`(select coalesce(sum(amount),0) from payments where booking_id = ${s.bookings.id} and status = 'PAID')`,
    invoices: sql<number>`(select count(*) from documents where booking_id = ${s.bookings.id} and kind = 'INVOICE')`,
    invSent: sql<number>`(select count(*) from documents where booking_id = ${s.bookings.id} and kind = 'INVOICE' and sent_at is not null)`,
    its: sql<number>`(select count(*) from documents where booking_id = ${s.bookings.id} and kind = 'ITINERARY')`,
    itSent: sql<number>`(select count(*) from documents where booking_id = ${s.bookings.id} and kind = 'ITINERARY' and sent_at is not null)`,
    passports: sql<number>`(select count(distinct traveler_id) from traveler_files where booking_id = ${s.bookings.id} and kind = 'PASSPORT')`,
    guide: sql<string>`coalesce((select name from tour_guides where id = ${s.bookings.guideId}), '')`,
  }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).orderBy(desc(s.bookings.createdAt)).limit(limit);
  return rows.map((r) => ({ id: r.b.id, ref: r.b.ref, status: r.b.status, title: r.b.titleOverride || r.tour, name: r.b.guestName || r.c.name, email: r.c.email, whatsapp: r.c.whatsapp || r.c.phone || "", country: r.c.country || "", travelDate: r.b.travelDate, pax: r.b.adults + r.b.children + r.b.infants, isPrivate: r.b.isPrivate, total: r.b.total, paid: Number(r.paid), currency: r.b.currency, createdAt: r.b.createdAt.getTime(), invoices: Number(r.invoices), invoiceSent: Number(r.invSent), itineraries: Number(r.its), itinerarySent: Number(r.itSent), hotel: r.b.hotel ?? "", guideName: r.guide ?? "", passports: Number(r.passports) }));
}

const EVENT_TEXT = (type: string, note: string | null) => {
  if (type === "CREATED") return "Order created";
  if (type.startsWith("STATUS_")) return `Status changed to ${BOOKING_STATUS_LABEL[type.slice(7)] ?? type.slice(7)}`;
  if (type === "NOTE") return note ?? "";
  return type;
};
const DOC_EVENT_TEXT = (type: string, kind: string, number: string, note: string | null) => {
  const what = kind === "INVOICE" ? "Invoice" : "Itinerary";
  if (type === "CREATED") return `${what} ${number} created`;
  if (type === "EMAILED") return `${what} ${number} emailed to ${note ?? "customer"}`;
  if (type === "EMAIL_FAILED") return `${what} ${number} email failed: ${note ?? ""}`;
  if (type === "MARKED_SENT") return `${what} ${number} marked as sent (${(note ?? "").toLowerCase()})`;
  return `${what} ${number}: ${type}`;
};

export async function loadOrder(id: string): Promise<Order | null> {
  const origin = await linkOrigin();
  const [main, payments, docs, events, docEvents, its, templates, methods, g, travelerRows, fileRows, guideRows] = await Promise.all([
    db.select({ b: s.bookings, tour: s.tours, dest: s.destinations, c: s.customers }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.bookings.id, id)),
    db.select().from(s.payments).where(eq(s.payments.bookingId, id)).orderBy(desc(s.payments.createdAt)),
    db.select().from(s.documents).where(eq(s.documents.bookingId, id)).orderBy(desc(s.documents.createdAt)),
    db.select().from(s.bookingEvents).where(eq(s.bookingEvents.bookingId, id)).orderBy(desc(s.bookingEvents.createdAt)),
    db.select({ e: s.documentEvents, kind: s.documents.kind, number: s.documents.number }).from(s.documentEvents).innerJoin(s.documents, eq(s.documentEvents.documentId, s.documents.id)).where(eq(s.documents.bookingId, id)),
    db.select({ id: s.itineraries.id, name: s.itineraries.name, status: s.itineraries.status }).from(s.itineraries).where(eq(s.itineraries.bookingId, id)).orderBy(desc(s.itineraries.updatedAt)),
    db.select({ id: s.itineraries.id, name: s.itineraries.name }).from(s.itineraries).where(eq(s.itineraries.isTemplate, true)).orderBy(asc(s.itineraries.name)),
    db.select({ label: s.paymentMethods.label }).from(s.paymentMethods).where(eq(s.paymentMethods.active, true)).orderBy(asc(s.paymentMethods.sortOrder)),
    getSettings(),
    db.select().from(s.travelers).where(eq(s.travelers.bookingId, id)),
    db.select({ id: s.travelerFiles.id, travelerId: s.travelerFiles.travelerId, kind: s.travelerFiles.kind, filename: s.travelerFiles.filename, mime: s.travelerFiles.mime, size: s.travelerFiles.size, createdAt: s.travelerFiles.createdAt }).from(s.travelerFiles).where(eq(s.travelerFiles.bookingId, id)).orderBy(asc(s.travelerFiles.createdAt)),
    db.select().from(s.tourGuides).orderBy(asc(s.tourGuides.name)),
  ]);
  const row = main[0]; if (!row) return null;
  const { b, tour, dest, c } = row;
  const paid = Math.round(payments.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0) * 100) / 100;
  const balance = Math.max(0, Math.round((b.total - paid) * 100) / 100);
  const activity: Activity[] = [
    ...events.map((e) => ({ at: e.createdAt.getTime(), kind: (e.type === "NOTE" ? "note" : e.type === "CREATED" ? "created" : "status") as Activity["kind"], text: EVENT_TEXT(e.type, e.note) })),
    ...payments.filter((p) => p.status === "PAID").map((p) => ({ at: p.createdAt.getTime(), kind: "payment" as const, text: `Payment received: ${new Intl.NumberFormat("en-US", { style: "currency", currency: b.currency }).format(p.amount)} (${p.provider})` })),
    ...docEvents.map((d) => ({ at: d.e.createdAt.getTime(), kind: "doc" as const, text: DOC_EVENT_TEXT(d.e.type, d.kind, d.number, d.e.note) })),
  ].sort((a, z) => z.at - a.at);
  const depTarget = b.payMode === "FULL" ? b.total : b.payMode === "DEPOSIT" ? Math.min(b.total, b.deposit) : 0;
  const dueNow = b.payMode === "FULL" || paid >= depTarget - 0.005 ? balance : Math.round((depTarget - paid) * 100) / 100;
  const day = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const depDays = Number(g["invoice.depositDeadlineDays"]) || 3;
  return {
    id: b.id, ref: b.ref, status: b.status, title: b.titleOverride || tour.title, tourId: tour.id, tourTitle: tour.title, destination: dest.name,
    customer: { name: b.guestName || c.name, email: c.email, whatsapp: c.whatsapp ?? "", phone: c.phone ?? "", country: c.country ?? "", nationality: c.nationality ?? "" },
    travelDate: b.travelDate, adults: b.adults, children: b.children, infants: b.infants, isPrivate: b.isPrivate, hotel: b.hotel ?? "", pickupNotes: b.pickupLocation ?? "", requests: b.specialRequests ?? "", dietary: b.dietary ?? "", accessibility: b.accessibility ?? "",
    addons: parseJson(b.addonsJson, []), subtotal: b.subtotal, discount: b.discount, total: b.total, deposit: b.deposit, payMode: b.payMode, currency: b.currency, paid, balance, source: b.source ?? "", createdAt: b.createdAt.getTime(), titleOverride: b.titleOverride ?? "", costTotal: b.costTotal,
    payments: payments.filter((p) => p.status !== "SUPERSEDED").map((p) => ({ id: p.id, amount: p.amount, method: p.provider, note: p.providerRef ?? "", status: p.status, at: p.createdAt.getTime() })),
    documents: docs.map((d) => ({ id: d.id, kind: d.kind, number: d.number, sentAt: d.sentAt ? d.sentAt.getTime() : null, sentTo: d.sentTo, sentVia: d.sentVia, amount: d.amount, currency: d.currency, createdAt: d.createdAt.getTime(), shareUrl: `${origin}/api/documents/${d.id}/pdf?t=${signDoc(d.id)}` })),
    itineraries: its, activity, templates, methods: methods.map((m) => m.label),
    defaults: { currency: b.currency, dueNow, deadline: day(depDays) }, trackUrl: `${origin}/track/${b.ref}`, guideUrl: `${origin}/guide/${b.id}?t=${signGuide(b.id)}`,
    reviewUrl: b.status === "COMPLETED" ? `${origin}/review/${b.ref}?t=${signReview(b.ref)}` : null, companyName: g["company.name"] || "us",
    travelers: [...travelerRows].sort((a, z) => ["ADULT", "CHILD", "INFANT"].indexOf(a.type) - ["ADULT", "CHILD", "INFANT"].indexOf(z.type)).map((t) => ({ id: t.id, name: t.fullName, type: t.type, age: t.age, nationality: t.nationality ?? "", dob: t.dob ?? "", passportNumber: decryptText(t.passportNumber), passportExpiry: t.passportExpiry ?? "", notes: t.notes ?? "", files: fileRows.filter((f) => f.travelerId === t.id).map((f) => ({ id: f.id, kind: f.kind, filename: f.filename, mime: f.mime, size: f.size, createdAt: f.createdAt.getTime() })) })),
    guides: guideRows.filter((x) => x.active || x.id === b.guideId).map((x) => ({ id: x.id, name: x.name, phone: x.phone, languages: x.languages, active: x.active })),
    ops: { preferredLanguage: b.preferredLanguage ?? "", guideId: b.guideId ?? "", driver: b.driver ?? "", vehicle: b.vehicle ?? "", flightArrival: b.flightArrival ?? "", flightDeparture: b.flightDeparture ?? "", roomType: b.roomType ?? "", pickupTime: b.pickupTime ?? "", occasion: b.occasion ?? "", emergencyContact: b.emergencyContact ?? "", visaStatus: b.visaStatus ?? "", guideNotes: b.guideNotes ?? "" },
  };
}
