import type { Metadata } from "next";
import Link from "next/link";
import { db, schema as s } from "@/db";
import SiteImage from "@/components/SiteImage";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Egypt Destinations: Cairo, Giza, Luxor, Aswan, Alexandria & Hurghada", description: "Where to go in Egypt: Cairo, Giza pyramids, Luxor, Aswan, Alexandria and Hurghada. Best time to visit, where to stay and the tours worth booking in each destination.", alternates: { canonical: "/destinations" } };
export default async function Destinations() {
  const d = await db.select().from(s.destinations);
  return <div className="container-x py-10"><p className="eyebrow">Where to go</p><h1 className="h1 mt-2 !text-[34px] sm:!text-5xl">Egypt destinations and travel guides</h1>
    <p className="mt-3 max-w-3xl text-[17px] text-ink/70">From the Giza pyramids and Cairo's markets to Luxor's temples, Aswan's Nile and the Red Sea, find the best places to visit in Egypt, when to go and which tours to book.</p>
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{d.map((x) => <Link key={x.id} href={`/destinations/${x.slug}`} className="group overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-[0_2px_12px_rgba(20,16,16,.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(20,16,16,.14)]"><div className="relative"><SiteImage src={x.imageUrl} alt={`${x.name}, Egypt`} destination={x.slug} className="relative aspect-[4/3]" /><div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" /><p className="absolute bottom-3 left-4 font-display text-2xl font-extrabold text-white">{x.name}</p></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-gold-700">{x.tagline}</p><p className="mt-2 line-clamp-3 text-sm text-ink/70">{x.overview}</p><span className="mt-3 inline-block text-sm font-bold">Explore {x.name} →</span></div></Link>)}</div></div>;
}
