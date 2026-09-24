import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { monthlyFinance, type FinanceMonth } from "@/lib/finance";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

function parseMonth(v?: string): FinanceMonth {
  const m = /^(\d{4})-(\d{2})$/.exec(v ?? ""); const now = new Date();
  if (m) { const year = Number(m[1]); const month = Number(m[2]); if (month >= 1 && month <= 12 && year >= 2020 && year <= 2100) return { year, month }; }
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}
const monthValue = (m: FinanceMonth) => `${m.year}-${String(m.month).padStart(2, "0")}`;
const shift = (m: FinanceMonth, by: number) => { const d = new Date(Date.UTC(m.year, m.month - 1 + by, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }; };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireStaff("finance");
  const sp = await searchParams; const m = parseMonth(sp.m); const r = await monthlyFinance(m);
  const thisMonth = { year: new Date().getUTCFullYear(), month: new Date().getUTCMonth() + 1 };
  const isCurrent = m.year === thisMonth.year && m.month === thisMonth.month;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Finance</h1><p className="text-sm text-ink/65">Profit for {r.label}, based on payments recorded as paid.</p></div>
        <a href={`/api/admin/finance/pdf?m=${monthValue(m)}`} className="btn btn-outline !min-h-[44px]">Download PDF</a>
      </div>

      <form className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/admin/finance?m=${monthValue(shift(m, -1))}`} className="btn btn-outline !min-h-[44px] !px-3" aria-label="Previous month">←</Link>
        <label className="sr-only" htmlFor="fin-month">Month</label><input id="fin-month" type="month" name="m" defaultValue={monthValue(m)} max={monthValue(thisMonth)} className="input !w-auto" />
        <button className="btn btn-outline !min-h-[44px]">Go</button>
        {!isCurrent && <Link href={`/admin/finance?m=${monthValue(shift(m, 1))}`} className="btn btn-outline !min-h-[44px] !px-3" aria-label="Next month">→</Link>}
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="stat-card"><p className="stat-label">Revenue collected</p><p className="stat-value">{money(r.revenue)}</p></div>
        <div className="stat-card"><p className="stat-label">Cost</p><p className="stat-value text-ink/70">{money(r.cost)}</p></div>
        <div className="stat-card"><p className="stat-label">Profit</p><p className={`stat-value ${r.profit >= 0 ? "text-[#17663A]" : "text-red-700"}`}>{money(r.profit)}</p></div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="stat-card"><p className="stat-label">Margin</p><p className="stat-value">{r.margin != null ? `${r.margin.toFixed(1)}%` : "—"}</p></div>
        <div className="stat-card"><p className="stat-label">Payments counted</p><p className="stat-value">{r.paymentCount}</p></div>
        <div className="stat-card"><p className="stat-label">Bookings involved</p><p className="stat-value">{r.bookingCount}</p></div>
      </div>

      {r.noCostCount > 0 && <div className="mt-4 rounded-2xl border border-gold-600/40 bg-gold-500/10 p-4 text-sm">
        <b>{r.noCostCount} booking{r.noCostCount === 1 ? "" : "s"}</b> ({money(r.noCostRevenue)} of the revenue above) {r.noCostCount === 1 ? "has" : "have"} no cost recorded on its tour, so profit for {r.noCostCount === 1 ? "it isn't" : "those aren't"} counted here.
        Add a cost in <Link href="/admin/tours" className="font-semibold underline">Tours</Link> (Cost + profit %) to include it next time.
      </div>}

      <div className="mt-6 card overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Profit by tour">
        <table className="table-modern min-w-[560px]">
          <thead><tr>
            <th>Tour</th><th className="text-right">Bookings</th><th className="text-right">Revenue</th>
            <th className="text-right">Cost</th><th className="text-right">Profit</th><th className="text-right">Margin</th>
          </tr></thead>
          <tbody>{r.byTour.map((t) => (
            <tr key={t.tourId}>
              <td className="font-semibold">{t.title}</td><td className="text-right">{t.bookings}</td>
              <td className="text-right">{money(t.revenue)}</td><td className="text-right text-ink/65">{money(t.cost)}</td>
              <td className={`text-right font-bold ${t.profit >= 0 ? "text-[#17663A]" : "text-red-700"}`}>{money(t.profit)}</td>
              <td className="text-right text-ink/65">{t.margin != null ? `${t.margin.toFixed(0)}%` : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!r.byTour.length && <p className="p-6 text-center text-sm text-ink/65">No payments were recorded as paid in {r.label}.</p>}
      </div>
      <p className="mt-4 text-xs text-ink/65">Cash basis: a payment counts in the month it was recorded as paid, not the month of the trip. Add-ons and private-tour upgrades are counted as pure profit, since only the core tour has a recorded cost.</p>
    </div>
  );
}
