import type { Metadata } from "next";
import { jsonLd } from "@/lib/jsonld";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listTours, guideBySlug, publishedGuides } from "@/lib/queries";
import { parseGuideBody, wordCount } from "@/lib/guide-body";
import { parseJson, SITE, waLink } from "@/lib/format";
import GuideBody from "@/components/GuideBody";
import TourCard from "@/components/TourCard";
import WhatsAppButton from "@/components/WhatsAppButton";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };
const get = async (slug: string) => (await guideBySlug(slug)) ?? undefined;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const g = await get((await params).slug); if (!g) return {};
  return { title: { absolute: g.seoTitle }, description: g.seoDescription, keywords: g.keywords ? g.keywords.split(",").map((k) => k.trim()) : undefined, alternates: { canonical: `/egypt-travel-guide/${g.slug}` }, openGraph: { type: "article", title: g.seoTitle, description: g.seoDescription, modifiedTime: g.updatedAt.toISOString() } };
}
export default async function Guide({ params }: P) {
  const g = await get((await params).slug); if (!g) notFound();
  const faqs = parseJson<{ q: string; a: string }[]>(g.faqs, []);
  const relSlugs = g.related.split(",").map((x) => x.trim()).filter(Boolean);
  const [allG, tours] = await Promise.all([publishedGuides(), listTours(g.destinationSlug ? { destination: g.destinationSlug } : {}, 3)]);
  const related = allG.filter((x) => relSlugs.includes(x.slug)); const mates = allG.filter((x) => x.cluster === g.cluster);
  const pillar = mates.find((m) => m.isPillar && m.slug !== g.slug);
  const relOrdered = relSlugs.map((x) => related.find((r) => r.slug === x)).filter(Boolean) as typeof related;
  const more = [...relOrdered, ...mates.filter((m) => m.slug !== g.slug && !relOrdered.some((r) => r.slug === m.slug))].slice(0, 4);
  const blocks = parseGuideBody(g.body); const toc = blocks.filter((b) => b.t === "h2") as { text: string; id: string }[];
  const words = wordCount(g.body); const mins = Math.max(2, Math.round(words / 220));
  const updated = g.updatedAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.seoDescription, dateModified: g.updatedAt.toISOString(), mainEntityOfPage: `${SITE}/egypt-travel-guide/${g.slug}`, wordCount: words, keywords: g.keywords || undefined, author: { "@type": "Organization", name: "Egypt Knight Tours", url: SITE }, publisher: { "@type": "Organization", name: "Egypt Knight Tours", logo: { "@type": "ImageObject", url: `${SITE}/logo.webp` } } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], ["Egypt travel guide", "/egypt-travel-guide"], [g.title, `/egypt-travel-guide/${g.slug}`]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) },
    ...(faqs.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
  ];
  return (
    <div className="container-x py-8">
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(o) }} />)}
      <nav aria-label="Breadcrumb" className="text-sm text-ink/65"><Link href="/egypt-travel-guide" className="hover:text-ink">Egypt travel guide</Link> / <span>{g.cluster}</span></nav>
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 max-w-3xl">
          <p className="inline-block rounded-full bg-gold-500/25 px-3 py-1 text-xs font-bold uppercase tracking-[.12em]">{g.cluster}{g.isPillar ? " · Complete guide" : ""}</p>
          <h1 className="mt-3 font-display text-[32px] font-extrabold leading-[1.08] tracking-tight sm:text-[46px]">{g.title}</h1>
          <p className="mt-3 text-[18px] leading-relaxed text-ink/70">{g.summary}</p>
          <p className="mt-4 text-sm text-ink/65">By the Egypt Knight Tours team · Updated {updated} · {mins} min read</p>
          <details className="mt-6 rounded-2xl border border-ink/10 bg-white p-4 lg:hidden"><summary className="cursor-pointer font-display font-extrabold">In this guide</summary><ol className="mt-3 space-y-2 text-[15px]">{toc.map((t) => <li key={t.id}><a className="font-semibold text-ink/80 hover:text-ink" href={`#${t.id}`}>{t.text}</a></li>)}</ol></details>
          <div className="mt-8"><GuideBody body={g.body} /></div>

          {faqs.length > 0 && <section className="mt-12" aria-labelledby="faq-h"><h2 id="faq-h" className="scroll-mt-24 font-display text-[26px] font-extrabold sm:text-[30px]">Frequently asked questions</h2>
            <div className="mt-4 divide-y divide-ink/10 rounded-3xl border border-ink/10 bg-white px-5">{faqs.map((f) => <details key={f.q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold">{f.q}<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-500 text-lg transition group-open:rotate-45" aria-hidden>+</span></summary><p className="mt-3 text-[16px] leading-relaxed text-ink/75">{f.a}</p></details>)}</div></section>}

          <section className="mt-12 rounded-3xl bg-ink p-7 text-white sm:p-9"><p className="eyebrow !text-gold-500">Plan it with a local team</p><h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Ready to plan your Egypt trip?</h2><p className="mt-2 text-white/70">Tell us your dates and who's travelling. We'll send a suggested itinerary and a clear price, usually within one working day.</p>
            <div className="mt-5 flex flex-wrap gap-3"><Link href="/plan-my-trip" className="btn btn-primary">Build my Egypt trip</Link><Link href="/tours" className="btn !border !border-white/25 !text-white hover:!border-white">Browse tours</Link><WhatsAppButton href={waLink(`Hi Egypt Knight, I just read "${g.title}" and I'd like help planning.`)} label="Ask us on WhatsApp" /></div></section>
        </article>

        <aside className="hidden lg:block"><div className="sticky top-24 space-y-5">
          <nav aria-label="Table of contents" className="rounded-2xl border border-ink/10 bg-white p-5"><p className="font-display text-lg font-extrabold">In this guide</p><ol className="mt-3 space-y-2.5 text-[14.5px] leading-snug">{toc.map((t) => <li key={t.id}><a className="font-semibold text-ink/70 hover:text-ink" href={`#${t.id}`}>{t.text}</a></li>)}</ol></nav>
          {pillar && <Link href={`/egypt-travel-guide/${pillar.slug}`} className="block rounded-2xl border border-gold-600/40 bg-gold-500/15 p-5 transition hover:bg-gold-500/25"><p className="text-xs font-bold uppercase tracking-[.12em] text-gold-800">Start with the complete guide</p><p className="mt-1 font-display text-lg font-extrabold leading-snug">{pillar.title}</p><span className="mt-2 inline-block text-sm font-bold">Read it →</span></Link>}
        </div></aside>
      </div>

      {more.length > 0 && <section className="mt-14"><h2 className="h2">Keep reading</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{more.map((m) => <Link key={m.id} href={`/egypt-travel-guide/${m.slug}`} className="group rounded-3xl border border-ink/10 bg-white p-5 shadow-[0_2px_12px_rgba(20,16,16,.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(20,16,16,.12)]"><p className="text-xs font-bold uppercase tracking-[.12em] text-gold-800">{m.cluster}</p><p className="mt-1 font-display text-lg font-extrabold leading-snug group-hover:underline">{m.title}</p><span className="mt-3 inline-block text-sm font-bold">Read →</span></Link>)}</div></section>}
      {tours.length > 0 && <section className="mt-14"><h2 className="h2">Egypt tours to book</h2><div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{tours.map((t) => <TourCard key={t.id} t={t} />)}</div></section>}
    </div>
  );
}
