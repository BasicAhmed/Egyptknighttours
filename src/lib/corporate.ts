import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { r2 } from "./pricing";

export const SERVICE_TYPES = [
  ["TRANSFER", "Transfer"], ["ENTRANCE_TICKETS", "Entrance tickets"], ["PERMITS", "Permits"], ["FELUCCA", "Felucca"],
  ["MOTOR_BOAT", "Motor / boat"], ["TOUR_GUIDE", "Tour guide"], ["HOTEL", "Hotel"], ["NILE_CRUISE", "Nile cruise"],
  ["AIRPORT_SERVICES", "Airport services"], ["TRANSPORTATION", "Transportation"], ["OTHER", "Other"],
] as const;
export const SERVICE_TYPE_LABEL: Record<string, string> = Object.fromEntries(SERVICE_TYPES);
export const REQUEST_STATUS = ["NEW", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const REQUEST_STATUS_LABEL: Record<string, string> = { NEW: "New", CONFIRMED: "Confirmed", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled" };
export const SERVICE_STATUS = ["PENDING", "CONFIRMED", "DONE", "CANCELLED"] as const;
export const SERVICE_STATUS_LABEL: Record<string, string> = { PENDING: "Pending", CONFIRMED: "Confirmed", DONE: "Done", CANCELLED: "Cancelled" };

export async function newCorporateRef() {
  let ref = ""; let n = 1000 + Math.floor(Math.random() * 9000);
  for (let i = 0; i < 8; i++) {
    ref = `CR-${n}`;
    if (!(await db.select({ id: s.corporateRequests.id }).from(s.corporateRequests).where(eq(s.corporateRequests.ref, ref))).length) return ref;
    n = 1000 + Math.floor(Math.random() * 9000);
  }
  return `CR-${Date.now()}`;
}

export type ServiceRow = typeof s.corporateServices.$inferSelect;
export function totals(services: Pick<ServiceRow, "cost" | "price">[]) {
  const cost = r2(services.reduce((a, x) => a + x.cost, 0));
  const price = r2(services.reduce((a, x) => a + x.price, 0));
  return { cost, price, profit: r2(price - cost) };
}

export async function listCorporateRequests(limit = 200) {
  // The subquery's own table (corporate_services) has its own "id" column, so the outer request's id must be qualified
  // by table name here — a bare reference resolves to the inner table's id instead and silently matches nothing.
  const rows = await db.select({
    r: s.corporateRequests,
    serviceCount: sql<number>`(select count(*) from corporate_services where request_id = corporate_requests.id)`,
    price: sql<number>`(select coalesce(sum(price), 0) from corporate_services where request_id = corporate_requests.id)`,
  }).from(s.corporateRequests).orderBy(desc(s.corporateRequests.createdAt)).limit(limit);
  return rows.map((x) => ({ ...x.r, serviceCount: x.serviceCount, price: r2(x.price) }));
}

export async function loadCorporateRequest(id: string) {
  const [r] = await db.select().from(s.corporateRequests).where(eq(s.corporateRequests.id, id));
  if (!r) return null;
  const services = await db.select().from(s.corporateServices).where(eq(s.corporateServices.requestId, id)).orderBy(s.corporateServices.createdAt);
  return { request: r, services, totals: totals(services) };
}

export async function buildCorporateInvoiceData(id: string) {
  const { getSettings, companyFrom } = await import("./settings");
  const { activeMethods } = await import("./invoice");
  const data = await loadCorporateRequest(id);
  if (!data) return null;
  const { request: r, services, totals: t } = data;
  const g = await getSettings();
  const [methods, company] = await Promise.all([activeMethods(r.currency), Promise.resolve(companyFrom(g))]);
  return {
    ref: r.ref, issuedAt: new Date().toISOString().slice(0, 10), currency: r.currency, status: REQUEST_STATUS_LABEL[r.status] ?? r.status,
    company, bill: { name: r.companyName, contact: r.companyContact, email: r.companyEmail, phone: r.companyPhone },
    guest: { name: r.customerName, contact: r.customerContact, count: r.customerCount },
    serviceDate: r.serviceDate ?? "", location: r.location, notes: r.notes, requirements: r.requirements,
    services: services.map((sv) => ({ type: SERVICE_TYPE_LABEL[sv.type] ?? sv.type, label: sv.label, date: sv.date ?? "", time: sv.time ?? "", location: sv.location, people: sv.people, price: sv.price })),
    total: t.price, methods,
  };
}
