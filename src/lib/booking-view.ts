import { db, schema as s } from "@/db";
import { asc, eq } from "drizzle-orm";
import { parseJson } from "./format";
import { signDoc } from "./booking-token";
import { openRequests, requestText, type CustomerRequest } from "./customer-requests";

export async function loadBooking(ref: string) {
  const [row] = await db.select({ b: s.bookings, tour: s.tours, dest: s.destinations, c: s.customers })
    .from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id))
    .where(eq(s.bookings.ref, ref));
  if (!row) return null;
  const [payments, events, travelers, requests] = await Promise.all([
    db.select().from(s.payments).where(eq(s.payments.bookingId, row.b.id)),
    db.select().from(s.bookingEvents).where(eq(s.bookingEvents.bookingId, row.b.id)).orderBy(asc(s.bookingEvents.createdAt)),
    db.select().from(s.travelers).where(eq(s.travelers.bookingId, row.b.id)),
    db.select().from(s.bookingRequests).where(eq(s.bookingRequests.bookingId, row.b.id)),
  ]);
  const docs = (await db.select().from(s.documents).where(eq(s.documents.bookingId, row.b.id))).filter((d) => d.sentAt).map((d) => ({ id: d.id, kind: d.kind, number: d.number, sentAt: d.sentAt as Date, url: `/api/documents/${d.id}/pdf?t=${signDoc(d.id)}` }));
  const paid = payments.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);
  const addons = parseJson<{ name: string; price: number; unit: string }[]>(row.b.addonsJson, []);
  const due = Math.max(0, Math.round((row.b.total - paid) * 100) / 100);
  // What we still need from the customer: open requests only, important first; a balance request disappears once paid.
  const open = openRequests<CustomerRequest>(requests.map((r): CustomerRequest => ({ id: r.id, kind: r.kind, text: r.text, important: r.important, dueDate: r.dueDate, status: r.status, createdAt: r.createdAt.getTime() })), due)
    .map((r) => ({ id: r.id, important: r.important, ...requestText(r, { balance: due, currency: row.b.currency, travelDate: row.b.travelDate, travelers: row.b.adults + row.b.children + row.b.infants, ref: row.b.ref }) }));
  return { ...row, payments, events, travelers, docs, paid, addons, due, requests: open };
}
export type LoadedBooking = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;

export const MILESTONES = [
  { key: "received", label: "Booking received", types: ["CREATED"] },
  { key: "confirmed", label: "Confirmed by our team", types: ["STATUS_CONFIRMED", "STATUS_INVOICED"] },
  { key: "paid", label: "Payment received", types: ["STATUS_PARTIALLY_PAID", "STATUS_DEPOSIT_PAID", "STATUS_PAID"] },
  { key: "trip", label: "Your trip", types: [] },
  { key: "done", label: "Completed", types: ["STATUS_COMPLETED"] },
] as const;
// index of the current milestone for a booking status
export function currentMilestone(status: string) {
  return ({ INQUIRY: 0, QUOTE_SENT: 0, ITINERARY_SENT: 0, PENDING: 0, CONFIRMED: 1, INVOICED: 1, PARTIALLY_PAID: 2, DEPOSIT_PAID: 2, PAID: 2, COMPLETED: 4, CANCELLED: -1 } as Record<string, number>)[status] ?? 0;
}
