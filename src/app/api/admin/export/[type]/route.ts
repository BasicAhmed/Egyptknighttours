import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { desc, eq } from "drizzle-orm";
import { getSession, PERMS } from "@/lib/auth";

export const dynamic = "force-dynamic";
const esc = (v: unknown) => { const t = v == null ? "" : v instanceof Date ? v.toISOString() : String(v); return /[",\n\r]/.test(t) || /^[=+\-@]/.test(t) ? `"${(/^[=+\-@]/.test(t) ? "'" + t : t).replace(/"/g, '""')}"` : t; };
const csv = (head: string[], rows: unknown[][]) => "\uFEFF" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");

// Staff-only CSV downloads, so your data is always yours to keep and move. Passport data is never included.
export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const u = await getSession(); const { type } = await params;
  const allowed = type === "leads" ? PERMS.leads : PERMS.bookings;
  if (!u || !allowed.includes(u.role) || !["orders", "customers", "leads"].includes(type)) return new NextResponse("Not found", { status: 404 });
  let body = "";
  if (type === "orders") {
    const r = await db.select({ b: s.bookings, tour: s.tours.title, c: s.customers }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).orderBy(desc(s.bookings.createdAt));
    body = csv(["Booking ID", "Status", "Created", "Customer", "Email", "WhatsApp", "Nationality", "Experience", "Travel date", "Adults", "Children", "Infants", "Total", "Deposit", "Currency", "Hotel", "Source"], r.map(({ b, tour, c }) => [b.ref, b.status, b.createdAt, c.name, c.email, c.whatsapp, c.nationality, b.titleOverride || tour, b.travelDate, b.adults, b.children, b.infants, b.total, b.deposit, b.currency, b.hotel, b.source]));
  } else if (type === "customers") {
    const r = await db.select().from(s.customers).orderBy(desc(s.customers.createdAt));
    body = csv(["Name", "Email", "WhatsApp", "Phone", "Country", "Nationality", "Created"], r.map((c) => [c.name, c.email, c.whatsapp, c.phone, c.country, c.nationality, c.createdAt]));
  } else {
    const r = await db.select().from(s.leads).orderBy(desc(s.leads.createdAt));
    body = csv(["Name", "Email", "WhatsApp", "Country", "Kind", "Status", "Source", "Travel dates", "Travelers", "Budget", "Interests", "Message", "Marketing consent", "Created"], r.map((l) => [l.name, l.email, l.whatsapp, l.country, l.kind, l.status, l.source, l.travelDates, l.travelers, l.budget, l.interests, l.message, l.consentMarketing ? "yes" : "no", l.createdAt]));
  }
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "EXPORT", entity: type });
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="egypt-knight-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
