import { db, schema as s } from "@/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { r2 } from "./pricing";
import { getSettings, usdAmount } from "./settings";

export type FinanceMonth = { year: number; month: number }; // month is 1-12
export type TourFinanceRow = { tourId: string; title: string; bookings: number; revenue: number; cost: number; profit: number; margin: number | null };
export type CorporateFinanceRow = { requestId: string; ref: string; companyName: string; revenue: number; cost: number; profit: number; margin: number | null };
export type FinanceReport = {
  label: string; from: string; to: string;
  revenue: number; cost: number; profit: number; margin: number | null;
  paymentCount: number; bookingCount: number; noCostCount: number; noCostRevenue: number;
  byTour: TourFinanceRow[];
  // Corporate requests, folded into the totals above and also broken out on their own — a second, separate revenue channel.
  corporateRevenue: number; corporateCost: number; corporateProfit: number; corporatePaymentCount: number; corporateRequestCount: number;
  byCorporate: CorporateFinanceRow[];
};

export function monthBounds({ year, month }: FinanceMonth): { from: Date; to: Date; label: string } {
  const from = new Date(Date.UTC(year, month - 1, 1)); const to = new Date(Date.UTC(year, month, 1));
  const label = from.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { from, to, label };
}

// Cash-basis profit: every confirmed payment received in the month counts as revenue. Each payment's share of the
// booking's cost (its own snapshot, taken when the booking was made) is recognized in proportion to how much of the
// total that payment covers, so a deposit this month and a balance next month each carry their fair share of the cost.
// Every figure — everywhere in this function — is converted to USD the moment it's read from the database, using the
// rates in Settings, before any adding, proportioning, or combining happens. A 30,000 EGP payment is real money, but
// it is not 30,000 US dollars, and this file is the one place that decides how everything ultimately gets compared.
export async function monthlyFinance(m: FinanceMonth): Promise<FinanceReport> {
  const { from, to, label } = monthBounds(m);
  const g = await getSettings();
  const rows0 = await db.select({ amount: s.payments.amount, currency: s.bookings.currency, bookingId: s.payments.bookingId, bookingTotal: s.bookings.total, costTotal: s.bookings.costTotal, tourId: s.bookings.tourId, tourTitle: s.tours.title, titleOverride: s.bookings.titleOverride })
    .from(s.payments).innerJoin(s.bookings, eq(s.payments.bookingId, s.bookings.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id))
    .where(and(eq(s.payments.status, "PAID"), gte(s.payments.createdAt, from), lt(s.payments.createdAt, to)));
  const rows = rows0.map((r) => ({ ...r, amount: usdAmount(r.amount, r.currency, g), bookingTotal: usdAmount(r.bookingTotal, r.currency, g), costTotal: r.costTotal != null ? usdAmount(r.costTotal, r.currency, g) : null }));

  let revenue = 0, cost = 0, noCostRevenue = 0; const noCostBookings = new Set<string>(); const seenBookings = new Set<string>();
  const byTour = new Map<string, TourFinanceRow>();
  for (const p of rows) {
    const amount = r2(p.amount); revenue += amount; seenBookings.add(p.bookingId);
    const share = p.costTotal != null && p.bookingTotal > 0 ? r2(p.costTotal * (amount / p.bookingTotal)) : 0;
    if (p.costTotal == null) { noCostRevenue += amount; noCostBookings.add(p.bookingId); } else cost += share;
    const key = p.tourId; const row = byTour.get(key) ?? { tourId: key, title: p.titleOverride || p.tourTitle, bookings: 0, revenue: 0, cost: 0, profit: 0, margin: null };
    row.revenue = r2(row.revenue + amount); row.cost = r2(row.cost + share); byTour.set(key, row);
  }
  for (const [id, row] of byTour) { row.profit = r2(row.revenue - row.cost); row.margin = row.revenue > 0 ? r2((row.profit / row.revenue) * 100) : null; row.bookings = new Set(rows.filter((r) => r.tourId === id).map((r) => r.bookingId)).size; byTour.set(id, row); }

  // Corporate requests are a second revenue channel, folded into the same totals above using the same cash-basis, proportional-cost
  // logic: each payment's share of the cost is whatever fraction of the request's total price that payment covers.
  // In PERCENTAGE pricing mode the per-service "price" column is never set (only cost is), so the total price has to be
  // worked out the same way corporate.ts's totals() does — cost × (1 + service percent) — never by summing "price".
  const crows0 = await db.select({
    amount: s.corporatePayments.amount, currency: s.corporateRequests.currency, requestId: s.corporatePayments.requestId, ref: s.corporateRequests.ref, companyName: s.corporateRequests.companyName,
    pricingMode: s.corporateRequests.pricingMode, servicePercent: s.corporateRequests.servicePercent,
    totalCost: sql<number>`(select coalesce(sum(cost), 0) from corporate_services where request_id = corporate_requests.id)`,
    itemizedPrice: sql<number>`(select coalesce(sum(price), 0) from corporate_services where request_id = corporate_requests.id)`,
  }).from(s.corporatePayments).innerJoin(s.corporateRequests, eq(s.corporatePayments.requestId, s.corporateRequests.id))
    .where(and(eq(s.corporatePayments.status, "PAID"), gte(s.corporatePayments.createdAt, from), lt(s.corporatePayments.createdAt, to)));
  const crows = crows0.map((r) => {
    const totalCost = usdAmount(r.totalCost, r.currency, g);
    const rawTotalPrice = r.pricingMode === "PERCENTAGE" ? r.totalCost * (1 + (r.servicePercent ?? 0) / 100) : r.itemizedPrice;
    return { requestId: r.requestId, ref: r.ref, companyName: r.companyName, amount: usdAmount(r.amount, r.currency, g), totalCost, totalPrice: usdAmount(rawTotalPrice, r.currency, g) };
  });

  let corporateRevenue = 0, corporateCost = 0; const seenRequests = new Set<string>();
  const byCorporate = new Map<string, CorporateFinanceRow>();
  for (const p of crows) {
    const amount = r2(p.amount); corporateRevenue += amount; seenRequests.add(p.requestId);
    const share = p.totalPrice > 0 ? r2(p.totalCost * (amount / p.totalPrice)) : 0; corporateCost += share;
    const row = byCorporate.get(p.requestId) ?? { requestId: p.requestId, ref: p.ref, companyName: p.companyName, revenue: 0, cost: 0, profit: 0, margin: null };
    row.revenue = r2(row.revenue + amount); row.cost = r2(row.cost + share); byCorporate.set(p.requestId, row);
  }
  for (const [id, row] of byCorporate) { row.profit = r2(row.revenue - row.cost); row.margin = row.revenue > 0 ? r2((row.profit / row.revenue) * 100) : null; byCorporate.set(id, row); }
  const corporateProfit = r2(corporateRevenue - corporateCost);

  revenue += corporateRevenue; cost += corporateCost;
  const profit = r2(revenue - cost); const margin = revenue > 0 ? r2((profit / revenue) * 100) : null;
  return { label, from: from.toISOString().slice(0, 10), to: new Date(to.getTime() - 86400000).toISOString().slice(0, 10),
    revenue: r2(revenue), cost: r2(cost), profit, margin, paymentCount: rows.length, bookingCount: seenBookings.size,
    noCostCount: noCostBookings.size, noCostRevenue: r2(noCostRevenue), byTour: [...byTour.values()].sort((a, b) => b.profit - a.profit),
    corporateRevenue: r2(corporateRevenue), corporateCost: r2(corporateCost), corporateProfit, corporatePaymentCount: crows.length, corporateRequestCount: seenRequests.size,
    byCorporate: [...byCorporate.values()].sort((a, b) => b.profit - a.profit) };
}
