import type { Metadata } from "next";
import Link from "next/link";
import { db, schema as s } from "@/db";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Egypt Destinations: Cairo, Luxor, Aswan and More", description: "Where to go in Egypt: Cairo, Giza, Luxor, Aswan, Alexandria and Hurghada, with tips on when to go and how long to stay.", alternates: { canonical: "/destinations" } };
export default async function Destinations() {
  const d = await db.select().from(s.destinations);
  return <div className="container-x py-10"><h1 className="h1 !text-3xl sm:!text-4xl">Egypt destinations</h1>
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{d.map((x) => <Link key={x.id} href={`/destinations/${x.slug}`} className="card overflow-hidden hover:border-gold-700"><div className="bg-ink p-6 text-white"><p className="font-display text-2xl font-bold">{x.name}</p><p className="text-gold-500">{x.tagline}</p></div><p className="p-4 text-sm text-ink/70">{x.overview.slice(0, 130)}…</p></Link>)}</div></div>;
}
