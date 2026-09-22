import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { blankItinerary, reid } from "./itinerary-templates";
import { parseJson } from "./format";
import type { ItineraryContent } from "@/pdf/types";

export async function createItineraryRecord(o: { templateId?: string; bookingId?: string; name?: string; userId: string; isTemplate?: boolean; intent?: "customer" | "tour" | "pdf" }) {
  let content: ItineraryContent = blankItinerary(); let name = (o.name ?? "").trim(); let sourceTemplateId: string | null = null;
  if (o.templateId) { const [t] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, o.templateId)); if (t) { content = reid(parseJson<ItineraryContent>(t.content, content)); sourceTemplateId = t.id; if (!name) name = o.isTemplate ? `${t.name} (copy)` : t.name; } }
  let customerLabel = "";
  if (o.bookingId) {
    const [r] = await db.select({ b: s.bookings, c: s.customers }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.bookings.id, o.bookingId));
    if (r) {
      const n = content.days.length || 1; const total = r.b.adults + r.b.children + r.b.infants;
      const end = new Date(r.b.travelDate + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() + n - 1);
      content = { ...content, customerName: r.c.name, travelers: `${total} traveler${total > 1 ? "s" : ""}`, startDate: r.b.travelDate, endDate: end.toISOString().slice(0, 10),
        days: content.days.map((d, i) => { const dt = new Date(r.b.travelDate + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + i); return { ...d, date: dt.toISOString().slice(0, 10) }; }) };
      customerLabel = `${r.c.name} — ${r.b.ref}`;
    }
  }
  if (!name) name = customerLabel || (o.isTemplate ? "New template" : "New itinerary");
  const [it] = await db.insert(s.itineraries).values({ name, content: JSON.stringify(content), bookingId: o.bookingId || null, sourceTemplateId, createdById: o.userId, isTemplate: !!o.isTemplate, intent: o.intent ?? "pdf" }).returning();
  return it;
}
