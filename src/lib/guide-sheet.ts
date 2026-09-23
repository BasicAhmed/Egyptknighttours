import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSettings } from "./settings";
import { parseJson } from "./format";
import { verifyGuide } from "./booking-token";
import type { ItineraryContent } from "@/pdf/types";

export type GuideSheet = {
  id: string; ref: string; title: string; travelDate: string; pickupTime: string; hotel: string; pickupNotes: string; meetingPoint: string; pickupInfo: string; language: string; isPrivate: boolean;
  adults: number; children: number; infants: number; travelers: { name: string; type: string; age: number | null; nationality: string; notes: string }[];
  customer: { name: string; whatsapp: string; phone: string; nationality: string }; guideName: string; driver: string; vehicle: string; flightArrival: string; flightDeparture: string; roomType: string; occasion: string; emergencyContact: string;
  dietary: string; accessibility: string; requests: string; guideNotes: string; currency: string; total: number; paid: number; balance: number;
  plan: { title: string; lines: string[] }[]; included: string[]; excluded: string[]; whatToBring: string; company: { name: string; whatsapp: string; email: string };
};
export type SheetResult = { state: "ok"; sheet: GuideSheet } | { state: "invalid" | "expired" | "cancelled" };

// The guide sheet shows what a guide needs on the day. Passport numbers and files are never included.
export async function loadGuideSheet(id: string, token?: string | null): Promise<SheetResult> {
  if (!verifyGuide(id, token)) return { state: "invalid" };
  const [r] = await db.select({ b: s.bookings, c: s.customers, t: s.tours }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.id, id));
  if (!r) return { state: "invalid" };
  if (r.b.status === "CANCELLED") return { state: "cancelled" };
  const last = new Date(r.b.travelDate + "T00:00:00Z").getTime() + 8 * 86_400_000; if (Date.now() > last) return { state: "expired" };
  const [trav, pays, guide, its, g] = await Promise.all([
    db.select().from(s.travelers).where(eq(s.travelers.bookingId, id)),
    db.select({ amount: s.payments.amount, status: s.payments.status }).from(s.payments).where(eq(s.payments.bookingId, id)),
    r.b.guideId ? db.select().from(s.tourGuides).where(eq(s.tourGuides.id, r.b.guideId)) : Promise.resolve([]),
    db.select().from(s.itineraries).where(eq(s.itineraries.bookingId, id)).orderBy(desc(s.itineraries.createdAt)).limit(1), getSettings(),
  ]);
  const paid = pays.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);
  let plan: { title: string; lines: string[] }[] = [];
  const content = its[0] ? parseJson<ItineraryContent | null>(its[0].content, null) : null;
  if (content?.days?.length) plan = content.days.map((d, i) => ({ title: `Day ${i + 1}${d.title ? ": " + d.title : ""}${d.location ? " (" + d.location + ")" : ""}`, lines: [...d.blocks.filter((b) => b.title).map((b) => `${b.time ? b.time + " · " : ""}${b.title}${b.description ? ": " + b.description : ""}`), ...(d.hotel?.name ? [`Overnight: ${d.hotel.name}`] : [])] }));
  else plan = parseJson<{ title: string; text: string }[]>(r.t.itinerary, []).map((d) => ({ title: d.title, lines: d.text ? [d.text] : [] }));
  const sheet: GuideSheet = {
    id, ref: r.b.ref, title: r.b.titleOverride || r.t.title, travelDate: r.b.travelDate, pickupTime: r.b.pickupTime ?? "", hotel: r.b.hotel ?? "", pickupNotes: r.b.pickupLocation ?? "", meetingPoint: r.t.meetingPoint ?? "", pickupInfo: r.t.pickupInfo ?? "", language: r.b.preferredLanguage ?? "", isPrivate: r.b.isPrivate,
    adults: r.b.adults, children: r.b.children, infants: r.b.infants, travelers: trav.map((t) => ({ name: t.fullName, type: t.type, age: t.age, nationality: t.nationality ?? "", notes: t.notes ?? "" })).sort((a, b) => ["ADULT", "CHILD", "INFANT"].indexOf(a.type) - ["ADULT", "CHILD", "INFANT"].indexOf(b.type)),
    customer: { name: r.b.guestName || r.c.name, whatsapp: r.c.whatsapp ?? "", phone: r.c.phone ?? "", nationality: r.c.nationality ?? "" }, guideName: guide[0]?.name ?? "", driver: r.b.driver ?? "", vehicle: r.b.vehicle ?? "", flightArrival: r.b.flightArrival ?? "", flightDeparture: r.b.flightDeparture ?? "", roomType: r.b.roomType ?? "", occasion: r.b.occasion ?? "", emergencyContact: r.b.emergencyContact ?? "",
    dietary: r.b.dietary ?? "", accessibility: r.b.accessibility ?? "", requests: r.b.specialRequests ?? "", guideNotes: r.b.guideNotes ?? "", currency: r.b.currency, total: r.b.total, paid, balance: Math.max(0, r.b.total - paid),
    plan, included: parseJson<string[]>(r.t.included, []), excluded: parseJson<string[]>(r.t.excluded, []), whatToBring: r.t.whatToBring ?? "", company: { name: g["company.name"], whatsapp: g["company.whatsapp"], email: g["company.email"] },
  };
  return { state: "ok", sheet };
}
