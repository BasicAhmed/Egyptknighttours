import Link from "next/link";
import { db, schema as s } from "../../db";
import { and, count, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { requireStaff } from "../../lib/auth";
import { money } from "../../lib/format";
export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const live = ne(s.bookings.status, "CANCELLED");
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const since = new Date(Date.now() - 30 * 86400000);
  const [tot] = await db.select({ rev: sql<number>`coalesce(sum(${s.bookings.total}),0)`, n: count() }).from(s.bookings).where(live);
  const [pend] = await db.select({ n: count() }).from(s.bookings).where(eq(s.bookings.status, "PENDING"));
  const [newLeads] = await db.select({ n: count() }).from(s.leads).where(eq(s.leads.status, "NEW"));
  const [allLeads] = await db.select({ n: count() }).from(s.leads);
  const [aband] = await db.select({ n: count() }).from(s.leads).where(eq(s.leads.status, "ABANDONED"));
  const [followDue] = await db.select({ n: count() }).from(s.followUps).where(and(eq(s.followUps.status, "SCHEDULED"), lte(s.followUps.dueAt, new Date())));
  const [repeat] = await db.select({ n: sql<number>`count(*)` }).from(sql`(select customer_id from bookings group by customer_id having count(*) > 1)`);
  const [custN] = await db.select({ n: count() }).from(s.customers);
  const byTour = await db.select({ title: s.tours.title, n: count(), rev: sql<number>`sum(${s.bookings.total})` }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(live).groupBy(s.tours.id).orderBy(desc(sql`sum(${s.bookings.total})`)).limit(5);
  const byDest = await db.select({ name: s.destinations.name, rev: sql<number>`sum(${s.bookings.total})` }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id)).where(live).groupBy(s.destinations.id).orderBy(desc(sql`sum(${s.bookings.total})`)).limit(5);
  const bySource = await db.select({ src: sql<string>`coalesce(${s.leads.source},'unknown')`, n: count() }).from(s.leads).groupBy(sql`coalesce(${s.leads.source},'unknown')`).orderBy(desc(count())).limit(5);
  const upcoming = await db.select({ b: s.bookings, tour: s.tours.title, name: s.customers.name }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(and(live, gte(s.bookings.travelDate, today), lte(s.bookings.travelDate, week))).orderBy(s.bookings.travelDate).limit(8);
  const events = await db.select({ name: s.analyticsEvents.name, n: count() }).from(s.analyticsEvents).where(gte(s.analyticsEvents.createdAt, since)).groupBy(s.analyticsEvents.name);
  const ev = Object.fromEntries(events.map((e) => [e.name, e.n]));
  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "–");
  const stat = (l: string, v: string, href?: string) => { const c = <div className="card p-4"><p className="text-xs text-ink/60">{l}</p><p className="mt-1 font-display text-2xl font-bold">{v}</p></div>; return href ? <Link key={l} href={href}>{c}</Link> : <div key={l}>{c}</div>; };
  return <div>
    {sp.denied && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">Your role doesn't have access to that section.</p>}
    <h1 className="h2">Dashboard</h1>
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stat("Revenue (booked)", money(tot.rev))}{stat("Bookings", String(tot.n))}{stat("Pending bookings", String(pend.n), "/admin/bookings")}{stat("Avg booking value", tot.n ? money(tot.rev / tot.n) : "–")}
      {stat("New leads", String(newLeads.n), "/admin/leads")}{stat("Lead → booking rate", pct(tot.n, allLeads.n))}{stat("Follow-ups due", String(followDue.n), "/admin/leads")}{stat("Abandoned", String(aband.n))}
      {stat("Customers", String(custN.n))}{stat("Repeat customers", pct(Number(repeat.n), custN.n))}</div>
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="card p-4"><h2 className="font-semibold">Revenue by tour</h2>{byTour.length ? <ul className="mt-2 space-y-1 text-sm">{byTour.map((r) => <li key={r.title} className="flex justify-between gap-3"><span>{r.title} <span className="text-ink/50">({r.n})</span></span><b>{money(r.rev)}</b></li>)}</ul> : <p className="mt-2 text-sm text-ink/60">No bookings yet.</p>}</section>
      <section className="card p-4"><h2 className="font-semibold">Revenue by destination</h2>{byDest.length ? <ul className="mt-2 space-y-1 text-sm">{byDest.map((r) => <li key={r.name} className="flex justify-between"><span>{r.name}</span><b>{money(r.rev)}</b></li>)}</ul> : <p className="mt-2 text-sm text-ink/60">No bookings yet.</p>}</section>
      <section className="card p-4"><h2 className="font-semibold">Lead sources</h2>{bySource.length ? <ul className="mt-2 space-y-1 text-sm">{bySource.map((r) => <li key={r.src} className="flex justify-between"><span>{r.src}</span><b>{r.n}</b></li>)}</ul> : <p className="mt-2 text-sm text-ink/60">No leads yet.</p>}</section>
      <section className="card p-4"><h2 className="font-semibold">Upcoming trips (7 days)</h2>{upcoming.length ? <ul className="mt-2 space-y-1 text-sm">{upcoming.map((r) => <li key={r.b.id} className="flex justify-between gap-3"><span>{r.b.travelDate} · {r.name}{r.b.travelDate === today && <b className="ml-1 text-gold-700">pickup today</b>}<br /><span className="text-ink/50">{r.tour} · {r.b.hotel ?? "no hotel yet"}</span></span><span className="text-ink/60">{r.b.ref}</span></li>)}</ul> : <p className="mt-2 text-sm text-ink/60">Nothing in the next 7 days.</p>}</section>
      <section className="card p-4 lg:col-span-2"><h2 className="font-semibold">Booking funnel (30 days, first-party analytics)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">{[["Tour views", "view_tour"], ["Started booking", "start_booking"], ["Checkout", "start_checkout"], ["Purchases", "purchase"], ["WhatsApp clicks", "whatsapp_click"]].map(([l, k]) => <div key={k}><p className="text-ink/60">{l}</p><p className="font-display text-xl font-bold">{ev[k] ?? 0}</p></div>)}</div>
        <p className="mt-3 text-xs text-ink/60">View → book start: {pct(ev.start_booking ?? 0, ev.view_tour ?? 0)} · Start → purchase: {pct(ev.purchase ?? 0, ev.start_booking ?? 0)}. Google Search Console and website-traffic sources need external integrations.</p></section>
    </div></div>;
}
