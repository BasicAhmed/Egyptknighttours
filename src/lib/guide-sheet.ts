import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSettings } from "./settings";
import { verifyGuide } from "./booking-token";
import { composeGuideSheet, type GuideSheet } from "./guide-sheet-data";

export type { GuideSheet };
export type SheetResult = { state: "ok"; sheet: GuideSheet } | { state: "invalid" | "expired" | "cancelled" };

// The guide sheet shows what a guide needs on the day: who, where, when, and how to look after them. No prices or payments
// (see guide-sheet-data.ts), and passport numbers and files are never included.
export async function loadGuideSheet(id: string, token?: string | null): Promise<SheetResult> {
  if (!verifyGuide(id, token)) return { state: "invalid" };
  const [r] = await db.select({ b: s.bookings, c: s.customers, t: s.tours }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.id, id));
  if (!r) return { state: "invalid" };
  if (r.b.status === "CANCELLED") return { state: "cancelled" };
  const last = new Date(r.b.travelDate + "T00:00:00Z").getTime() + 8 * 86_400_000; if (Date.now() > last) return { state: "expired" };
  const [trav, guide, its, g] = await Promise.all([
    db.select().from(s.travelers).where(eq(s.travelers.bookingId, id)),
    r.b.guideId ? db.select().from(s.tourGuides).where(eq(s.tourGuides.id, r.b.guideId)) : Promise.resolve([]),
    db.select().from(s.itineraries).where(eq(s.itineraries.bookingId, id)).orderBy(desc(s.itineraries.createdAt)).limit(1), getSettings(),
  ]);
  return { state: "ok", sheet: composeGuideSheet({ b: r.b, t: r.t, c: r.c, travelers: trav, guideName: guide[0]?.name ?? "", itineraryContent: its[0]?.content ?? null, company: { name: g["company.name"], whatsapp: g["company.whatsapp"], email: g["company.email"] } }) };
}
