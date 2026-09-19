import type { Metadata } from "next";
import Link from "next/link";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Egypt Travel Guide: Visas, Weather, Itineraries and Tips", description: "Practical Egypt travel guides from a local team: when to go, visas, money, safety and day-by-day itineraries.", alternates: { canonical: "/egypt-travel-guide" } };
export default async function Guides() {
  const g = await db.select().from(s.guides).where(eq(s.guides.status, "PUBLISHED"));
  const clusters = [...new Set(g.map((x) => x.cluster))];
  return <div className="container-x py-10"><h1 className="h1 !text-3xl sm:!text-4xl">Egypt travel guide</h1><p className="mt-2 max-w-2xl text-ink/70">Straight answers to the questions every first-time visitor has.</p>
    {clusters.map((c) => <section key={c} className="mt-8"><h2 className="h2 !text-xl">{c}</h2><div className="mt-3 grid gap-4 md:grid-cols-3">{g.filter((x) => x.cluster === c).map((x) => <Link key={x.id} href={`/egypt-travel-guide/${x.slug}`} className="card p-5 hover:border-gold-700"><h3 className="font-display text-lg font-bold">{x.title}</h3><p className="mt-1 text-sm text-ink/70">{x.summary}</p></Link>)}</div></section>)}</div>;
}
