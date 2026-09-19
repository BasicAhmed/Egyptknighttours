import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema as s } from "@/db";
import { eq, and } from "drizzle-orm";
import { listTours } from "@/lib/queries";
import TourCard from "@/components/TourCard";
import { SITE } from "@/lib/format";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };
const get = async (slug: string) => (await db.select().from(s.destinations).where(eq(s.destinations.slug, slug)))[0];
export async function generateMetadata({ params }: P): Promise<Metadata> { const d = await get((await params).slug); return d ? { title: d.seoTitle, description: d.seoDescription, alternates: { canonical: `/destinations/${d.slug}` } } : {}; }
export default async function Destination({ params }: P) {
  const d = await get((await params).slug); if (!d) notFound();
  const tours = await listTours({ destination: d.slug });
  const guides = await db.select().from(s.guides).where(and(eq(s.guides.destinationSlug, d.slug), eq(s.guides.status, "PUBLISHED")));
  const sections = [["Best time to visit", d.bestTime], ["How to get there", d.howToGet], ["Where to stay", d.whereToStay], ["Recommended time", d.recommendedDays], ["Local tips", d.tips]];
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], ["Destinations", "/destinations"], [d.name, `/destinations/${d.slug}`]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) };
  return <div className="container-x py-10"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    <nav aria-label="Breadcrumb" className="text-sm text-ink/60"><Link href="/">Home</Link> / <Link href="/destinations">Destinations</Link></nav>
    <h1 className="h1 mt-3">{d.name}</h1><p className="mt-1 text-lg text-gold-700 font-semibold">{d.tagline}</p><p className="mt-4 max-w-3xl text-ink/80">{d.overview}</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{sections.map(([h, p]) => <div key={h} className="card p-5"><h2 className="font-display text-lg font-bold">{h}</h2><p className="mt-1 text-sm text-ink/70">{p}</p></div>)}</div>
    <h2 className="h2 mt-10">Tours in {d.name}</h2>
    {tours.length ? <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{tours.map((t) => <TourCard key={t.id} t={t} />)}</div> : <p className="mt-2 text-ink/70">New tours are on the way. <Link className="underline" href="/plan-my-trip">Tell us what you'd like</Link>.</p>}
    {guides.length > 0 && <><h2 className="h2 mt-10">Guides</h2><ul className="mt-3 space-y-2">{guides.map((g) => <li key={g.id}><Link className="underline" href={`/egypt-travel-guide/${g.slug}`}>{g.title}</Link></li>)}</ul></>}
  </div>;
}
