import type { Metadata } from "next";
import Link from "next/link";
import { db, schema as s } from "@/db";
import { asc } from "drizzle-orm";
import { listTours } from "@/lib/queries";
import TourCard from "@/components/TourCard";
import TourFilters from "@/components/TourFilters";
import Tracker from "@/components/Tracker";
import { SITE } from "@/lib/format";

export const dynamic = "force-dynamic";
type SP = Record<string, string | undefined>;
export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams; const filtered = Object.values(sp).some(Boolean);
  return {
    title: "Egypt Tours & Packages: Private Tours, Day Trips, Nile Cruises",
    description: "Book Egypt tours with a local team: private Giza pyramids tours, Cairo day trips, Luxor and Aswan tours, Nile cruises, multi-day Egypt packages and airport transfers. Clear prices, 50% deposit.",
    alternates: { canonical: "/tours" }, robots: filtered ? { index: false, follow: true } : undefined,
  };
}
export default async function Tours({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const dests = await db.select({ slug: s.destinations.slug, name: s.destinations.name }).from(s.destinations).orderBy(asc(s.destinations.name));
  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  const tours = await listTours({ destination: sp.destination, category: sp.category, audience: sp.audience, type: sp.type, maxPrice: num(sp.maxPrice), minDays: sp.duration === "multi" ? 2 : undefined, maxDays: sp.duration === "day" ? 1 : undefined, sort: sp.sort, q: sp.q });
  const active = Object.values(sp).some(Boolean);
  const ld = { "@context": "https://schema.org", "@type": "ItemList", name: "Egypt tours", itemListElement: tours.slice(0, 20).map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/tours/${t.slug}`, name: t.title })) };
  return (
    <div className="container-x py-8">
      <Tracker name={active ? "filter_tours" : "search_tours"} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <p className="eyebrow">Egypt tours and packages</p>
      <h1 className="h1 mt-2 !text-[34px] sm:!text-5xl">Egypt tours, day trips and Nile cruises</h1>
      <p className="mt-3 max-w-3xl text-[17px] text-ink/70">Choose from private Egypt tours, Giza pyramids day trips, Cairo and Luxor tours, Nile cruises, multi-day Egypt packages and airport transfers, all run by a local team with clear prices and a 50% deposit.</p>
      <div className="mt-6"><TourFilters dests={dests} current={{ destination: sp.destination, category: sp.category, audience: sp.audience, type: sp.type, duration: sp.duration, maxPrice: sp.maxPrice, sort: sp.sort, q: sp.q }} count={tours.length} /></div>
      {tours.length ? <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{tours.map((t) => <TourCard key={t.id} t={t} />)}</div>
        : <div className="mt-6 rounded-3xl border border-dashed border-ink/20 p-10 text-center"><p className="font-display text-xl font-extrabold">No tours match those filters</p><p className="mt-1 text-ink/65">Try removing a filter, or <Link href="/plan-my-trip" className="font-semibold underline">tell us what you want</Link> and we'll build it for you.</p><Link href="/tours" className="btn btn-primary mt-5">Clear all filters</Link></div>}
    </div>
  );
}
