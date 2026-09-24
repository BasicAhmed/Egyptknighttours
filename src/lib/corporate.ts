import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { r2 } from "./pricing";
// Server-only data access lives in this file; the plain labels/lists live in corporate-constants.ts so a client
// component can import just those without accidentally pulling in server-only code (db, next/headers, next/cache).
export * from "./corporate-constants";
import { SERVICE_TYPE_LABEL, REQUEST_STATUS_LABEL } from "./corporate-constants";

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
// ITEMIZED: each service has its own price, summed. PERCENTAGE: services only carry a cost — the price is the total
// cost plus one service-fee percentage applied to it, so profit still comes out the same either way.
export function totals(services: Pick<ServiceRow, "cost" | "price">[], pricingMode: string, servicePercent: number | null) {
  const cost = r2(services.reduce((a, x) => a + x.cost, 0));
  const price = pricingMode === "PERCENTAGE" ? r2(cost * (1 + (servicePercent ?? 0) / 100)) : r2(services.reduce((a, x) => a + x.price, 0));
  return { cost, price, profit: r2(price - cost) };
}

export async function listCorporateRequests(limit = 200) {
  // Every correlated subquery here must qualify "corporate_requests.id" by table name explicitly — both the services and
  // payments tables have their own "id" column, and a bare reference silently resolves to the wrong one, matching nothing.
  const rows = await db.select({
    r: s.corporateRequests,
    serviceCount: sql<number>`(select count(*) from corporate_services where request_id = corporate_requests.id)`,
    cost: sql<number>`(select coalesce(sum(cost), 0) from corporate_services where request_id = corporate_requests.id)`,
    itemizedPrice: sql<number>`(select coalesce(sum(price), 0) from corporate_services where request_id = corporate_requests.id)`,
    paid: sql<number>`(select coalesce(sum(amount), 0) from corporate_payments where request_id = corporate_requests.id and status = 'PAID')`,
  }).from(s.corporateRequests).orderBy(desc(s.corporateRequests.createdAt)).limit(limit);
  return rows.map((x) => {
    const price = x.r.pricingMode === "PERCENTAGE" ? r2(x.cost * (1 + (x.r.servicePercent ?? 0) / 100)) : r2(x.itemizedPrice);
    return { ...x.r, serviceCount: x.serviceCount, price, paid: r2(x.paid), balance: r2(price - x.paid) };
  });
}

export async function loadCorporateRequest(id: string) {
  const [r] = await db.select().from(s.corporateRequests).where(eq(s.corporateRequests.id, id));
  if (!r) return null;
  const services = await db.select().from(s.corporateServices).where(eq(s.corporateServices.requestId, id)).orderBy(s.corporateServices.createdAt);
  const payments = await db.select().from(s.corporatePayments).where(eq(s.corporatePayments.requestId, id)).orderBy(desc(s.corporatePayments.createdAt));
  const t = totals(services, r.pricingMode, r.servicePercent);
  const paid = r2(payments.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0));
  const balance = r2(t.price - paid);
  return { request: r, services, payments, totals: t, paid, balance };
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
    pricingMode: r.pricingMode, servicePercent: r.servicePercent, subtotal: t.cost,
    services: services.map((sv) => ({ type: SERVICE_TYPE_LABEL[sv.type] ?? sv.type, label: sv.label, date: sv.date ?? "", time: sv.time ?? "", location: sv.location, people: sv.people, price: sv.price })),
    total: t.price, methods,
  };
}
