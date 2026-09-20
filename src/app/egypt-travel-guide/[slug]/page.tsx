import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema as s } from "@/db";
import { and, eq } from "drizzle-orm";
import { listTours } from "@/lib/queries";
import TourCard from "@/components/TourCard";
import { SITE } from "@/lib/format";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };
const get = async (slug: string) => (await db.select().from(s.guides).where(and(eq(s.guides.slug, slug), eq(s.guides.status, "PUBLISHED"))))[0];
export async function generateMetadata({ params }: P): Promise<Metadata> { const g = await get((await params).slug); return g ? { title: g.seoTitle, description: g.seoDescription, alternates: { canonical: `/egypt-travel-guide/${g.slug}` } } : {}; }
export default async function Guide({ params }: P) {
  const g = await get((await params).slug); if (!g) notFound();
  const tours = await listTours(g.destinationSlug ? { destination: g.destinationSlug } : {}, 3);
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.seoDescription, dateModified: g.updatedAt.toISOString(), mainEntityOfPage: `${SITE}/egypt-travel-guide/${g.slug}`, publisher: { "@type": "Organization", name: "Egypt Knight Tours" } };
  return <div className="container-x max-w-3xl py-10"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    <nav aria-label="Breadcrumb" className="text-sm text-ink/60"><Link href="/egypt-travel-guide">Egypt travel guide</Link> / {g.cluster}</nav>
    <h1 className="h1 mt-3 !text-3xl sm:!text-4xl">{g.title}</h1>
    <div className="mt-5 space-y-4 text-lg leading-relaxed text-ink/85">{g.body.split("\n\n").map((blk, i) => { const [first, ...rest] = blk.split("\n"); return first.startsWith("## ") ? <div key={i}><h2 className="font-display text-2xl font-extrabold text-ink">{first.slice(3)}</h2>{rest.length > 0 && <p className="mt-2">{rest.join(" ")}</p>}</div> : <p key={i}>{blk.replace(/\n/g, " ")}</p>; })}</div>
    <h2 className="h2 mt-12">Ready to plan your Egypt trip?</h2><div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{tours.map((t) => <TourCard key={t.id} t={t} />)}</div>
  </div>;
}
