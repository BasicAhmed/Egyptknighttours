import { db, schema as s } from "@/db";
import { asc, eq } from "drizzle-orm";
import { parseJson } from "./format";

export async function loadBooking(ref: string) {
  const [row] = await db.select({ b: s.bookings, tour: s.tours, dest: s.destinations, c: s.customers })
    .from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id))
    .where(eq(s.bookings.ref, ref));
  if (!row) return null;
  const [payments, events, travelers] = await Promise.all([
    db.select().from(s.payments).where(eq(s.payments.bookingId, row.b.id)),
    db.select().from(s.bookingEvents).where(eq(s.bookingEvents.bookingId, row.b.id)).orderBy(asc(s.bookingEvents.createdAt)),
    db.select().from(s.travelers).where(eq(s.travelers.bookingId, row.b.id)),
  ]);
  const paid = payments.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);
  const addons = parseJson<{ name: string; price: number; unit: string }[]>(row.b.addonsJson, []);
  return { ...row, payments, events, travelers, paid, addons, due: Math.max(0, Math.round((row.b.total - paid) * 100) / 100) };
}
export type LoadedBooking = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;

export const MILESTONES = [
  { key: "received", label: "Booking received", types: ["CREATED"] },
  { key: "confirmed", label: "Confirmed by our team", types: ["STATUS_CONFIRMED"] },
  { key: "paid", label: "Payment received", types: ["STATUS_DEPOSIT_PAID", "STATUS_PAID"] },
  { key: "trip", label: "Your trip", types: [] },
  { key: "done", label: "Completed", types: ["STATUS_COMPLETED"] },
] as const;
// index of the current milestone for a booking status
export function currentMilestone(status: string) {
  return ({ PENDING: 0, CONFIRMED: 1, DEPOSIT_PAID: 2, PAID: 2, COMPLETED: 4, CANCELLED: -1 } as Record<string, number>)[status] ?? 0;
}
