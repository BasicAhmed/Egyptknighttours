import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listTours } from "@/lib/queries";
import { LANDINGS, landingBySlug } from "@/lib/landing";
import TourCard from "@/components/TourCard";
import { SITE } from "@/lib/format";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const l = landingBySlug((await params).slug); if (!l) return {};
  return { title: { absolute: l.title }, description: l.description, alternates: { canonical: `/egypt-tours/${l.slug}` }, openGraph: { title: l.title, description: l.description } };
}
export default async function Landing({ params }: P) {
  const l = landingBySlug((await params).slug); if (!l) notFound();
  let tours = await listTours(l.filter, 24); const fallback = tours.length === 0 && !!l.fallbackNote;
  if (fallback) tours = await listTours({ category: "MULTI_DAY" }, 12);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], ["Egypt tours", "/tours"], [l.h1, `/egypt-tours/${l.slug}`]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: l.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    { "@context": "https://schema.org", "@type": "ItemList", name: l.h1, itemListElement: tours.slice(0, 20).map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/tours/${t.slug}`, name: t.title })) },
  ];
  return (
    <div className="container-x py-8">
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(o) }} />)}
      <nav aria-label="Breadcrumb" className="text-sm text-ink/60"><Link href="/">Home</Link> / <Link href="/tours">Egypt tours</Link> / {l.h1}</nav>
      <p className="eyebrow mt-4">{l.eyebrow}</p><h1 className="h1 mt-2 !text-[34px] sm:!text-5xl">{l.h1}</h1>
      <div className="mt-4 max-w-3xl space-y-3 text-[17px] leading-relaxed text-ink/75">{l.intro.map((p) => <p key={p}>{p}</p>)}</div>
      <ul className="mt-5 grid max-w-3xl gap-2 sm:grid-cols-2">{l.points.map((p) => <li key={p} className="flex gap-2 text-[15px] font-semibold"><span className="text-[#17663A]">✓</span>{p}</li>)}</ul>
      <h2 className="h2 mt-10">{fallback ? "Egypt tour packages you can add it to" : `${l.h1}: tours to book`}</h2>
      {fallback && <p className="mt-2 text-ink/65">{l.fallbackNote}</p>}
      {tours.length ? <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{tours.map((t) => <TourCard key={t.id} t={t} />)}</div> : <div className="mt-6 rounded-3xl border border-dashed border-ink/20 p-8 text-center"><p className="font-display text-xl font-extrabold">Tours for this are arranged on request</p><Link href="/plan-my-trip" className="btn btn-primary mt-4">Tell us what you want</Link></div>}
      <h2 className="h2 mt-12">Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white px-5">{l.faqs.map(([q, a]) => <details key={q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">{q}<span className="text-xl transition group-open:rotate-45" aria-hidden>+</span></summary><p className="mt-2 text-ink/70">{a}</p></details>)}</div>
      <h2 className="h2 mt-12">More ways to see Egypt</h2>
      <div className="mt-4 flex flex-wrap gap-2">{LANDINGS.filter((x) => x.slug !== l.slug).map((x) => <Link key={x.slug} href={`/egypt-tours/${x.slug}`} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-bold hover:border-ink">{x.h1}</Link>)}<Link href="/destinations" className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-bold hover:border-ink">Egypt destinations</Link></div>
    </div>
  );
}
