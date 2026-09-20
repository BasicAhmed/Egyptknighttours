import type { Metadata } from "next";
import { jsonLd } from "@/lib/jsonld";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listTours, destinationBySlug, publishedGuides } from "@/lib/queries";
import TourCard from "@/components/TourCard";
import SiteImage from "@/components/SiteImage";
import { SITE } from "@/lib/format";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };
const get = async (slug: string) => (await destinationBySlug(slug)) ?? undefined;
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await get((await params).slug); if (!d) return {};
  return { title: { absolute: d.seoTitle }, description: d.seoDescription, alternates: { canonical: `/destinations/${d.slug}` }, openGraph: { title: d.seoTitle, description: d.seoDescription, images: d.imageUrl ? [d.imageUrl] : undefined } };
}
export default async function Destination({ params }: P) {
  const d = await get((await params).slug); if (!d) notFound();
  const [tours, allG] = await Promise.all([listTours({ destination: d.slug }), publishedGuides()]);
  const guides = allG.filter((x) => x.destinationSlug === d.slug);
  const facts: [string, string, string][] = [[`Best time to visit ${d.name}`, d.bestTime, "☀"], [`How to get to ${d.name}`, d.howToGet, "✈"], [`Where to stay in ${d.name}`, d.whereToStay, "⌂"], [`Local tips for ${d.name}`, d.tips, "✓"]];
  const faqs: [string, string][] = [[`How many days do you need in ${d.name}?`, `We recommend ${d.recommendedDays.toLowerCase()} in ${d.name}.`], [`When is the best time to visit ${d.name}?`, d.bestTime], [`How do I get to ${d.name}?`, d.howToGet]];
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], ["Destinations", "/destinations"], [d.name, `/destinations/${d.slug}`]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) },
    { "@context": "https://schema.org", "@type": "TouristDestination", name: `${d.name}, Egypt`, description: d.seoDescription, url: `${SITE}/destinations/${d.slug}`, ...(d.imageUrl ? { image: d.imageUrl.startsWith("/") ? SITE + d.imageUrl : d.imageUrl } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  return (
    <div className="container-x py-8">
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(o) }} />)}
      <nav aria-label="Breadcrumb" className="text-sm text-ink/65"><Link href="/">Home</Link> / <Link href="/destinations">Destinations</Link> / {d.name}</nav>
      <div className="relative mt-4 overflow-hidden rounded-[28px]">
        <SiteImage src={d.imageUrl} alt={`${d.name}, Egypt: tours and things to do`} destination={d.slug} priority sizes="(min-width: 1024px) 1100px, 100vw" className="relative aspect-[4/3] sm:aspect-[21/9]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
        <div className="absolute bottom-0 p-5 text-white sm:p-8"><h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">{d.name} tours and things to do</h1><p className="mt-1 text-base text-white/85 sm:text-lg">{d.tagline}</p></div>
      </div>
      <p className="mt-6 max-w-3xl text-[17px] leading-relaxed text-ink/80">{d.overview}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">{facts.map(([h, p, ic]) => <section key={h} className="rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_2px_12px_rgba(20,16,16,.05)]"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-500 text-lg" aria-hidden>{ic}</span><h2 className="mt-3 font-display text-xl font-extrabold">{h}</h2><p className="mt-1.5 text-[15px] leading-relaxed text-ink/70">{p}</p></section>)}</div>
      <h2 className="h2 mt-12">{d.name} tours and day trips</h2>
      {tours.length ? <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{tours.map((t) => <TourCard key={t.id} t={t} />)}</div> : <p className="mt-2 text-ink/70">New {d.name} tours are on the way. <Link className="underline" href="/plan-my-trip">Tell us what you'd like</Link> and we'll build it.</p>}
      {guides.length > 0 && <><h2 className="h2 mt-12">{d.name} travel guides</h2><ul className="mt-3 space-y-2">{guides.map((g) => <li key={g.id}><Link className="font-semibold underline" href={`/egypt-travel-guide/${g.slug}`}>{g.title}</Link></li>)}</ul></>}
      <h2 className="h2 mt-12">{d.name} travel questions</h2>
      <div className="mt-4 divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white px-5">{faqs.map(([q, a]) => <details key={q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">{q}<span className="text-xl transition group-open:rotate-45" aria-hidden>+</span></summary><p className="mt-2 text-ink/70">{a}</p></details>)}</div>
    </div>
  );
}
