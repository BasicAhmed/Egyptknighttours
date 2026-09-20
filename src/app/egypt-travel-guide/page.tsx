import type { Metadata } from "next";
import Link from "next/link";
import { publishedGuides } from "@/lib/queries";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Egypt Travel Guide 2026: Planning, Itineraries, Costs & Tips", description: "Everything you need to plan a trip to Egypt: best time to visit, costs, itineraries, Cairo, Luxor and Aswan guides, visas, safety and travel tips from a local team.", alternates: { canonical: "/egypt-travel-guide" } };
const CLUSTERS = [
  { key: "Plan your trip", blurb: "Costs, timing, visas, money, safety and the practical questions that decide a good trip." },
  { key: "Where to go", blurb: "The best places to visit in Egypt, and how to choose between Cairo, Luxor, Aswan and beyond." },
  { key: "Itineraries", blurb: "Ready-made routes from a 3-day city break to a full 10-day Egypt trip, and how to pick a tour package." },
];
export default async function Guides() {
  const all = await publishedGuides();
  const known = new Set(CLUSTERS.map((c) => c.key)); const extra = [...new Set(all.map((g) => g.cluster))].filter((c) => !known.has(c)).map((key) => ({ key, blurb: "" }));
  return (
    <div className="container-x py-10">
      <p className="eyebrow">Egypt travel guide</p><h1 className="h1 mt-2 !text-[34px] sm:!text-5xl">Plan your Egypt trip like a local</h1>
      <p className="mt-3 max-w-3xl text-[17px] text-ink/70">Practical, honest guides from the team that runs Egypt tours every day. Start with a complete guide in each topic, then go deeper.</p>
      {[...CLUSTERS, ...extra].map((c) => {
        const list = all.filter((g) => g.cluster === c.key).sort((a, b) => Number(b.isPillar) - Number(a.isPillar) || a.title.localeCompare(b.title)); if (!list.length) return null;
        const pillar = list.find((g) => g.isPillar); const rest = list.filter((g) => g !== pillar);
        return (
          <section key={c.key} className="mt-12" aria-labelledby={`c-${c.key}`}>
            <h2 id={`c-${c.key}`} className="h2">{c.key}</h2>{c.blurb && <p className="mt-1 max-w-2xl text-ink/65">{c.blurb}</p>}
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              {pillar && <Link href={`/egypt-travel-guide/${pillar.slug}`} className="group flex flex-col justify-between rounded-3xl bg-ink p-7 text-white transition hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(20,16,16,.25)]"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-gold-500">Complete guide</p><h3 className="mt-2 font-display text-2xl font-extrabold leading-snug sm:text-[28px]">{pillar.title}</h3><p className="mt-3 text-white/70">{pillar.summary}</p></div><span className="mt-5 inline-flex items-center gap-2 font-bold text-gold-500">Read the guide <span className="transition group-hover:translate-x-1" aria-hidden>→</span></span></Link>}
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{rest.map((g) => <li key={g.id}><Link href={`/egypt-travel-guide/${g.slug}`} className="group flex h-full items-start justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_2px_10px_rgba(20,16,16,.05)] transition hover:border-ink/40"><span><span className="block font-display text-[17px] font-extrabold leading-snug group-hover:underline">{g.title}</span><span className="mt-1 block text-sm text-ink/65">{g.summary}</span></span><span className="mt-1 text-lg" aria-hidden>→</span></Link></li>)}</ul>
            </div>
          </section>);
      })}
    </div>
  );
}
