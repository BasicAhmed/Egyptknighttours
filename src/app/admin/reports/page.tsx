import { db, schema as s } from "@/db";
import { and, count, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { getSettings, usdAmount } from "@/lib/settings";
export const dynamic = "force-dynamic";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export default async function Reports() {
  await requireStaff();
  const live = ne(s.bookings.status, "CANCELLED"); const since = new Date(Date.now() - 30 * 86400000);
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  // All queries run at the same time, so this page waits for one round trip instead of thirteen.
  const [g, revRows, newLeads, allLeads, abandoned, followDue, customers, bySource, events, repeat] = await Promise.all([
    getSettings(),
    // Every order's own currency and total, fetched once — every revenue figure below is built from this single set,
    // converted to USD before anything is added up, so mixed-currency orders don't get silently mixed together as if
    // they were all the same currency.
    db.select({ total: s.bookings.total, currency: s.bookings.currency, createdAt: s.bookings.createdAt, tourId: s.bookings.tourId, tourTitle: s.tours.title, destName: s.destinations.name })
      .from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id)).where(live),
    db.select({ n: count() }).from(s.leads).where(eq(s.leads.status, "NEW")),
    db.select({ n: count() }).from(s.leads),
    db.select({ n: count() }).from(s.leads).where(eq(s.leads.status, "ABANDONED")),
    db.select({ n: count() }).from(s.followUps).where(and(eq(s.followUps.status, "SCHEDULED"), lte(s.followUps.dueAt, new Date()))),
    db.select({ n: count() }).from(s.customers),
    db.select({ src: sql<string>`coalesce(${s.leads.source},'unknown')`, n: count() }).from(s.leads).groupBy(sql`coalesce(${s.leads.source},'unknown')`).orderBy(desc(count())).limit(6),
    db.select({ name: s.analyticsEvents.name, n: count() }).from(s.analyticsEvents).where(gte(s.analyticsEvents.createdAt, since)).groupBy(s.analyticsEvents.name),
    db.select({ n: sql<number>`count(*)` }).from(sql`(select customer_id from bookings group by customer_id having count(*) > 1)`),
  ]);
  const rev = revRows.map((r) => ({ ...r, usd: usdAmount(r.total, r.currency, g) }));
  const totRev = rev.reduce((a, r) => a + r.usd, 0); const totN = rev.length;
  const monthRows = rev.filter((r) => r.createdAt >= monthStart); const monthRev = monthRows.reduce((a, r) => a + r.usd, 0);
  const byTourMap = new Map<string, { title: string; n: number; rev: number }>();
  for (const r of rev) { const row = byTourMap.get(r.tourId) ?? { title: r.tourTitle, n: 0, rev: 0 }; row.n++; row.rev += r.usd; byTourMap.set(r.tourId, row); }
  const byTour = [...byTourMap.values()].sort((a, b) => b.rev - a.rev).slice(0, 6);
  const byDestMap = new Map<string, number>();
  for (const r of rev) byDestMap.set(r.destName, (byDestMap.get(r.destName) ?? 0) + r.usd);
  const byDest = [...byDestMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, revv]) => ({ name, rev: revv }));
  const ev = Object.fromEntries(events.map((e) => [e.name, e.n]));
  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");
  const stat = (l: string, v: string) => <div key={l} className="rounded-2xl border border-ink/10 bg-white p-4"><p className="text-xs font-semibold text-ink/65">{l}</p><p className="mt-1 font-display text-2xl font-extrabold">{v}</p></div>;
  const list = (title: string, rows: [string, string][]) => <section className="rounded-2xl border border-ink/10 bg-white p-4"><h2 className="font-display font-extrabold">{title}</h2>{rows.length ? <ul className="mt-2 divide-y divide-ink/10 text-sm">{rows.map(([a, b]) => <li key={a} className="flex justify-between gap-3 py-1.5"><span>{a}</span><b>{b}</b></li>)}</ul> : <p className="mt-2 text-sm text-ink/65">Nothing yet.</p>}</section>;
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Reports</h1><p className="text-sm text-ink/65">How the business is doing. Every currency is converted to USD (rates in Settings → Company info) before totals are combined.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Booked this month", fmt(monthRev))}{stat("Orders this month", String(monthRows.length))}{stat("Booked, all time", fmt(totRev))}{stat("Average order", totN ? fmt(totRev / totN) : "–")}
        {stat("New inquiries", String(newLeads[0].n))}{stat("Inquiry → order", pct(totN, allLeads[0].n))}{stat("Follow-ups due", String(followDue[0].n))}{stat("Repeat customers", pct(Number(repeat[0].n), customers[0].n))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {list("Top tours by revenue", byTour.map((r) => [`${r.title} (${r.n})`, fmt(r.rev)]))}{list("Revenue by destination", byDest.map((r) => [r.name, fmt(r.rev)]))}
        {list("Where inquiries come from", bySource.map((r) => [r.src, String(r.n)]))}
        <section className="rounded-2xl border border-ink/10 bg-white p-4"><h2 className="font-display font-extrabold">Website funnel (30 days)</h2><div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">{[["Tour views", "view_tour"], ["Started booking", "start_booking"], ["Checkout", "start_checkout"], ["Purchases", "purchase"], ["WhatsApp clicks", "whatsapp_click"]].map(([l, k]) => <div key={k}><p className="text-ink/65">{l}</p><p className="font-display text-xl font-extrabold">{ev[k] ?? 0}</p></div>)}</div>
          <p className="mt-3 text-xs text-ink/65">View → start: {pct(ev.start_booking ?? 0, ev.view_tour ?? 0)} · Start → purchase: {pct(ev.purchase ?? 0, ev.start_booking ?? 0)} · Abandoned checkouts: {abandoned[0].n}</p></section>
      </div>
    </div>
  );
}
