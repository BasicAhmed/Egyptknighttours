import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { r2 } from "./pricing";
// Server-only data access lives in this file; the plain labels/lists and the money rules live in corporate-constants.ts so a
// client component (and the unit tests) can import just those without pulling in server-only code (db, next/headers, next/cache).
export * from "./corporate-constants";
import { SERVICE_TYPE_LABEL, REQUEST_STATUS_LABEL, servicePrices, requestTotals, balanceOf, isCharged, businessDay } from "./corporate-constants";

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
// Kept under its old name for existing callers. The rule itself (cancelled services not charged) is requestTotals().
export const totals = requestTotals;

// Money for many requests at once, from the same rules the request page uses: the services and paid payments of every
// listed request are read in two queries and run through requestTotals(), never re-summed in SQL a different way.
export async function moneyFor(requests: { id: string; pricingMode: string; servicePercent: number | null }[]) {
  const ids = requests.map((r) => r.id);
  const out = new Map<string, { cost: number; price: number; profit: number; paid: number; balance: number; serviceCount: number }>();
  if (!ids.length) return out;
  const [svcs, pays] = await Promise.all([
    db.select({ requestId: s.corporateServices.requestId, cost: s.corporateServices.cost, price: s.corporateServices.price, status: s.corporateServices.status }).from(s.corporateServices).where(inArray(s.corporateServices.requestId, ids)),
    db.select({ requestId: s.corporatePayments.requestId, amount: s.corporatePayments.amount }).from(s.corporatePayments).where(and(inArray(s.corporatePayments.requestId, ids), eq(s.corporatePayments.status, "PAID"))),
  ]);
  for (const r of requests) {
    const mine = svcs.filter((x) => x.requestId === r.id);
    const t = requestTotals(mine, r.pricingMode, r.servicePercent);
    const paid = r2(pays.filter((p) => p.requestId === r.id).reduce((a, p) => a + p.amount, 0));
    out.set(r.id, { ...t, paid, balance: balanceOf(t.price, paid), serviceCount: mine.filter(isCharged).length });
  }
  return out;
}

export async function listCorporateRequests(limit = 200) {
  const rows = await db.select().from(s.corporateRequests).orderBy(desc(s.corporateRequests.createdAt)).limit(limit);
  const m = await moneyFor(rows);
  return rows.map((r) => { const x = m.get(r.id)!; return { ...r, serviceCount: x.serviceCount, price: x.price, paid: x.paid, balance: x.balance }; });
}

export async function loadCorporateRequest(id: string) {
  const [r] = await db.select().from(s.corporateRequests).where(eq(s.corporateRequests.id, id));
  if (!r) return null;
  const [services, allPayments, events] = await Promise.all([
    db.select().from(s.corporateServices).where(eq(s.corporateServices.requestId, id)).orderBy(s.corporateServices.createdAt),
    db.select().from(s.corporatePayments).where(eq(s.corporatePayments.requestId, id)).orderBy(desc(s.corporatePayments.createdAt)),
    db.select().from(s.corporateEvents).where(eq(s.corporateEvents.requestId, id)).orderBy(desc(s.corporateEvents.createdAt)),
  ]);
  const t = requestTotals(services, r.pricingMode, r.servicePercent);
  const payments = allPayments.filter((p) => p.status === "PAID"); // removed payments stay in the table as VOID, for the record
  const paid = r2(payments.reduce((a, p) => a + p.amount, 0));
  return { request: r, services, prices: servicePrices(services, r.pricingMode, r.servicePercent), payments, removedPayments: allPayments.filter((p) => p.status === "VOID"), events, totals: t, paid, balance: balanceOf(t.price, paid) };
}

// One line in the request's history. Never throws: a history problem must not undo the change it describes.
export async function logCorporate(requestId: string, type: string, note: string, user: { uid: string; name?: string; email?: string }) {
  try { await db.insert(s.corporateEvents).values({ requestId, type, note, userId: user.uid, userName: user.name || user.email || "" }); }
  catch (e) { console.error("corporate history not written", e instanceof Error ? e.message : e); }
}

export async function buildCorporateInvoiceData(id: string) {
  const { getSettings, companyFrom } = await import("./settings");
  const { activeMethods } = await import("./invoice");
  const data = await loadCorporateRequest(id);
  if (!data) return null;
  const { request: r, services, prices, totals: t, payments, paid, balance } = data;
  const g = await getSettings();
  const [methods, company] = await Promise.all([activeMethods(r.currency), Promise.resolve(companyFrom(g))]);
  return {
    ref: r.ref, issuedAt: businessDay(new Date()), currency: r.currency, status: REQUEST_STATUS_LABEL[r.status] ?? r.status, cancelled: r.status === "CANCELLED",
    company, bill: { name: r.companyName, contact: r.companyContact, email: r.companyEmail, phone: r.companyPhone },
    guest: { name: r.customerName, contact: r.customerContact, count: r.customerCount },
    // Internal request notes stay off the invoice; only the notes written for the invoice are printed.
    serviceDate: r.serviceDate ?? "", location: r.location, notes: r.invoiceNotes, requirements: r.requirements,
    // Only charged services, each with its selling price (never its cost). Cancelled services are not billed.
    services: services.map((sv, i) => ({ sv, price: prices[i] })).filter(({ sv }) => isCharged(sv))
      .map(({ sv, price }) => ({ type: SERVICE_TYPE_LABEL[sv.type] ?? sv.type, label: sv.label, date: sv.date ?? "", time: sv.time ?? "", location: sv.location, people: sv.people, price })),
    total: t.price, methods,
    // Payments received so far (oldest first) and what is still owed. The staff-only payment note is not printed.
    payments: [...payments].reverse().map((p) => ({ date: businessDay(p.createdAt), method: p.method, amount: r2(p.amount) })),
    paid, balance: Math.max(0, balance), credit: Math.max(0, -balance),
  };
}
