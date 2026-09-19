import type { Metadata } from "next";
import Link from "next/link";
import { db, schema as s } from "@/db";
import { listTours } from "@/lib/queries";
import TourCard from "@/components/TourCard";
import Tracker from "@/components/Tracker";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Egypt Tours: Day Trips, Packages and Private Tours", description: "Browse Egypt tours by destination, duration, price and style. Private and shared tours, multi-day packages and airport transfers.", alternates: { canonical: "/tours" } };
type SP = Record<string, string | undefined>;
export default async function Tours({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const dests = await db.select().from(s.destinations);
  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  const days = sp.duration;
  const tours = await listTours({ destination: sp.destination, category: sp.category, audience: sp.audience, type: sp.type, maxPrice: num(sp.maxPrice), minDays: days === "multi" ? 2 : undefined, maxDays: days === "day" ? 1 : undefined, sort: sp.sort, q: sp.q });
  const active = Object.values(sp).some(Boolean);
  return (
    <div className="container-x py-10">
      <Tracker name={active ? "filter_tours" : "search_tours"} />
      <h1 className="h1 !text-3xl sm:!text-4xl">Egypt tours</h1>
      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" role="search">
        <div><label className="label" htmlFor="f-q">Search</label><input id="f-q" name="q" defaultValue={sp.q} className="input" placeholder="Pyramids, Luxor…" /></div>
        <div><label className="label" htmlFor="f-d">Destination</label><select id="f-d" name="destination" defaultValue={sp.destination ?? ""} className="input"><option value="">All</option>{dests.map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}</select></div>
        <div><label className="label" htmlFor="f-c">Category</label><select id="f-c" name="category" defaultValue={sp.category ?? ""} className="input"><option value="">All</option><option value="DAY">Day tours</option><option value="MULTI_DAY">Multi-day</option><option value="NILE_CRUISE">Nile cruises</option><option value="TRANSFER">Transfers</option></select></div>
        <div><label className="label" htmlFor="f-a">Travelling as</label><select id="f-a" name="audience" defaultValue={sp.audience ?? ""} className="input"><option value="">Anyone</option><option value="FAMILY">Family</option><option value="COUPLE">Couple</option><option value="FRIENDS">Friends</option></select></div>
        <div><label className="label" htmlFor="f-t">Private or shared</label><select id="f-t" name="type" defaultValue={sp.type ?? ""} className="input"><option value="">Either</option><option value="private">Private</option><option value="group">Shared</option></select></div>
        <div><label className="label" htmlFor="f-du">Duration</label><select id="f-du" name="duration" defaultValue={sp.duration ?? ""} className="input"><option value="">Any</option><option value="day">Day trip</option><option value="multi">Multi-day</option></select></div>
        <div><label className="label" htmlFor="f-p">Max price (USD)</label><select id="f-p" name="maxPrice" defaultValue={sp.maxPrice ?? ""} className="input"><option value="">Any</option><option value="50">Up to $50</option><option value="100">Up to $100</option><option value="200">Up to $200</option><option value="1000">Up to $1,000</option></select></div>
        <div><label className="label" htmlFor="f-s">Sort by</label><select id="f-s" name="sort" defaultValue={sp.sort ?? ""} className="input"><option value="">Most popular</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><button className="btn btn-primary">Show tours</button><Link href="/tours" className="btn btn-outline">Clear</Link></div>
      </form>
      <p className="mt-6 text-sm text-ink/60">{tours.length} tour{tours.length === 1 ? "" : "s"}</p>
      {tours.length ? <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{tours.map((t) => <TourCard key={t.id} t={t} />)}</div>
        : <div className="card mt-4 p-8 text-center"><p className="font-semibold">Nothing matches those filters.</p><p className="mt-1 text-ink/70">Try clearing a filter, or <Link href="/plan-my-trip" className="underline">tell us what you want</Link> and we'll build it.</p></div>}
    </div>
  );
}
