import Link from "next/link";
import { jsonLd } from "@/lib/jsonld";
import { db, schema as s } from "@/db";
import { listTours, allDestinations, publishedGuides, activeTestimonials } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import TourCard from "@/components/TourCard";
import SiteImage from "@/components/SiteImage";
import WhatsAppButton from "@/components/WhatsAppButton";
import VideoSection from "@/components/home/VideoSection";
import { TrustBand, WhyEgypt, HowItWorks, CompareTable, GuidesSection, ReviewsSection, GuidesLinks, SocialSection, ContactMap, FaqPanel, plus, https } from "@/components/home/sections";
import { waLink, money } from "@/lib/format";
import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { LANDINGS } from "@/lib/landing";
import { BUILDER_NAME } from "@/lib/builder";
import { SITE } from "@/lib/format";

export const dynamic = "force-dynamic";
const ORDER = ["giza", "luxor", "cairo", "aswan", "alexandria", "hurghada"];
const Star = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>;
const FAQ: [string, string][] = [
  ["How do I book?", "Choose a tour, pick your date and group size, and send your booking. We confirm availability and send your invoice and payment details by WhatsApp and email."],
  ["Do I have to pay everything now?", "No. A 50% deposit secures your booking and the rest is paid later. If you travel 7 or more days out, some tours also let you reserve now and pay later."],
  ["Is hotel pickup included?", "For most Cairo, Giza and Luxor tours, yes. Each tour page lists exactly what's included and what isn't."],
  ["Can I change or cancel?", "Every tour states its cancellation policy. Message us on WhatsApp if your plans change and we'll help."],
  ["Can you build a custom trip?", "Yes. Tell us your dates, group and interests and we'll send an itinerary and a price."],
];

export async function generateMetadata(): Promise<Metadata> {
  const g = await getSettings();
  const title = "Egypt Tours: Private Pyramids, Cairo, Luxor & Nile Cruise Packages";
  const description = `Book Egypt tours with a trusted local team: ${plus(g["site.years"])} years experience, ${plus(g["site.tours"])} tours completed and ${plus(g["site.reviews"])} five-star Tripadvisor reviews. Private Giza pyramids tours, Nile cruises, Cairo and Luxor packages.`;
  return { title: { absolute: title }, description, alternates: { canonical: "/" }, openGraph: { title, description, type: "website" }, keywords: ["Egypt tours", "Egypt tour packages", "private tours Egypt", "Giza pyramids tour", "Cairo day tours", "Luxor tours", "Nile cruise", "Egypt honeymoon", "Egypt family tours", "Cairo airport transfer"] };
}
export default async function Home() {
  const [all, dRows, allGuides, g, reviews] = await Promise.all([listTours({}, 12), allDestinations(), publishedGuides(), getSettings(), activeTestimonials(6)]);
  const guides = [...allGuides.filter((x) => x.isPillar), ...allGuides.filter((x) => !x.isPillar)].slice(0, 3);
  const popular = all.slice(0, 4); const featured = all[0];
  const dests = ORDER.map((slug) => dRows.find((d) => d.slug === slug)).filter(Boolean) as typeof dRows;
  const hero = (g["site.heroImage"] || process.env.NEXT_PUBLIC_HERO_IMAGE || "").trim() || null;
  const ta = https(g["site.tripadvisorUrl"]);
  const sameAs = [g["site.instagram"], g["site.facebook"], g["site.tiktok"], g["site.youtube"], g["site.tripadvisorUrl"]].map(https).filter(Boolean);
  const ld = [
    { "@context": "https://schema.org", "@type": "TravelAgency", name: g["company.name"], url: SITE, logo: `${SITE}/logo.webp`, image: `${SITE}/logo.webp`, description: "Egypt tours and travel packages by a local team: private pyramids tours, Nile cruises, Cairo, Luxor and Aswan.", areaServed: { "@type": "Country", name: "Egypt" }, email: g["company.email"], telephone: g["company.phone"] || g["company.whatsapp"], ...(sameAs.length ? { sameAs } : {}) },
    { "@context": "https://schema.org", "@type": "WebSite", name: g["company.name"], url: SITE, creator: { "@type": "Organization", name: BUILDER_NAME }, potentialAction: { "@type": "SearchAction", target: `${SITE}/tours?q={search_term_string}`, "query-input": "required name=search_term_string" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ];
  return (<>
    {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(o) }} />)}
    <section className="relative overflow-hidden pt-[68px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="orb orb-a -right-[28%] -top-[8%] h-[300px] w-[300px] opacity-70 sm:-right-[12%] sm:-top-[22%] sm:h-[760px] sm:w-[760px] sm:opacity-100" />
        <div className="orb orb-b -bottom-[10%] -left-[30%] h-[260px] w-[260px] opacity-60 sm:-bottom-[30%] sm:-left-[14%] sm:h-[700px] sm:w-[700px] sm:opacity-100" />
        <div className="orb orb-c hidden left-[30%] top-[10%] h-[380px] w-[380px] sm:block" />
        <svg className="sun-ring absolute -right-24 top-6 hidden opacity-[.18] lg:block" width="460" height="460" viewBox="0 0 200 200" fill="none" stroke="#C09040" strokeWidth=".5"><circle cx="100" cy="100" r="60" /><circle cx="100" cy="100" r="78" strokeDasharray="1.5 3" />{Array.from({ length: 24 }).map((_, i) => <line key={i} x1="100" y1="12" x2="100" y2="24" transform={`rotate(${i * 15} 100 100)`} />)}</svg>
        <svg className="absolute bottom-0 right-0 hidden opacity-[.09] md:block" width="520" height="200" viewBox="0 0 520 200" fill="none" stroke="#141010" strokeWidth="1.2"><path d="M20 200L150 60l130 140M170 200l110-92 110 92M330 200l70-58 70 58" /></svg>
      </div>
      <div className="container-x relative grid items-center gap-10 pb-14 pt-8 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-14">
        <div className="lg:col-span-6">
          <p className="eyebrow">Egypt tours, planned by locals</p>
          <h1 className="h1 mt-3 !text-[42px] sm:!text-6xl">Egypt is waiting. Are you <span className="relative whitespace-nowrap"><span className="relative z-10">ready?</span><span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-gold-500/70 sm:bottom-2 sm:h-4" /></span></h1>
          <p className="mt-5 max-w-xl text-lg text-ink/75">Egypt's tour team travellers keep coming back to: <b>{plus(g["site.years"])} years</b> of experience, <b>{plus(g["site.tours"])} tours</b> completed, and <b>{plus(g["site.reviews"])} five-star reviews</b> on Tripadvisor.</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold"><span className="flex gap-0.5 text-gold-600">{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</span><span>Trusted by thousands of travellers</span>{ta && <a href={ta} target="_blank" rel="noopener noreferrer" className="underline decoration-gold-600 decoration-2 underline-offset-4">See reviews</a>}</div>
          <form action="/tours" className="mt-6 rounded-2xl border border-ink/15 bg-white p-2 shadow-[0_14px_36px_rgba(20,16,16,.12)] sm:flex sm:items-center" role="search">
            <label className="block flex-[1.5] px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/65">Where to</span>
              <select name="destination" className="w-full bg-transparent py-1 text-base font-semibold outline-none"><option value="">Anywhere in Egypt</option>{dests.map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}</select></label>
            <span className="hidden h-10 w-px bg-ink/10 sm:block" />
            <label className="block flex-1 border-t border-ink/10 px-3 py-2 sm:border-0"><span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/65">Travelling as</span>
              <select name="audience" className="w-full bg-transparent py-1 text-base font-semibold outline-none"><option value="">Anyone</option><option value="FAMILY">Family</option><option value="COUPLE">Couple</option><option value="FRIENDS">Friends</option></select></label>
            <button className="btn btn-primary mt-1 w-full sm:mt-0 sm:w-auto sm:px-7">Search tours</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3"><Link href="/plan-my-trip" className="btn btn-dark">Plan my trip</Link><WhatsAppButton href={waLink("Hi Egypt Knight, I'd like help choosing an Egypt tour.")} label="Ask us on WhatsApp" /></div>
        </div>
        <div className="relative lg:col-span-6">
          <SiteImage src={hero} alt="Egypt" destination="giza" className="relative aspect-[4/4.4] rounded-[28px] shadow-[0_24px_60px_rgba(20,16,16,.18)] sm:aspect-[5/5]" />
          {featured && <Link href={`/tours/${featured.slug}`} className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xl transition hover:-translate-y-0.5 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[320px]">
            <span><span className="block text-[11px] font-semibold uppercase tracking-wide text-gold-800">Most booked</span><span className="block font-display text-[17px] font-bold leading-tight">{featured.title}</span><span className="text-sm text-ink/65">From {money(featured.discountPrice ?? featured.price)} per person</span></span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">→</span></Link>}
        </div>
      </div>
    </section>

    <TrustBand g={g} />

    <section className="container-x py-16 cv-auto">
      <div className="flex items-end justify-between"><div><p className="eyebrow">Top Egypt tours</p><h2 className="h2 mt-2">Our most popular Egypt tours</h2></div><Link href="/tours" className="hidden text-sm font-bold underline decoration-gold-500 decoration-2 underline-offset-4 sm:block">See all tours</Link></div>
      <div className="no-scrollbar -mx-5 mt-8 flex snap-x gap-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {popular.map((t) => <div key={t.id} className="w-[80%] shrink-0 snap-start sm:w-auto"><TourCard t={t} /></div>)}
      </div>
      <Link href="/tours" className="btn btn-outline mt-6 w-full sm:hidden">See all tours</Link>
    </section>

    <section className="container-x pb-16 cv-auto">
      <p className="eyebrow">Destinations</p><h2 className="h2 mt-2">Where to go in Egypt: Cairo, Giza, Luxor, Aswan</h2>
      <div className="mt-7 grid auto-rows-[170px] grid-cols-2 gap-3 sm:auto-rows-[210px] md:grid-cols-4">
        {dests.map((d, i) => (
          <Link key={d.id} href={`/destinations/${d.slug}`} className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 md:row-span-2" : i === 5 ? "col-span-2" : ""}`}>
            <SiteImage src={d.imageUrl} alt={`${d.name} tours and things to do in Egypt`} destination={d.slug} className="absolute inset-0 transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
            <div className="absolute bottom-0 p-4 text-white"><p className="font-display text-2xl font-bold">{d.name}</p><p className="text-sm text-white/85">{d.tagline}</p></div>
          </Link>))}
        <Link href="/plan-my-trip" className="col-span-2 flex flex-col justify-end rounded-2xl bg-ink p-5 text-white transition hover:bg-black md:col-span-2"><p className="font-display text-2xl font-bold">Not sure where?</p><p className="text-white/70">Tell us your dates and who's coming. We'll suggest a route.</p><span className="mt-3 font-semibold text-gold-500">Build my trip →</span></Link>
      </div>
    </section>

    <VideoSection url={g["site.videoUrl"]} start={g["site.videoStart"]} />
    <WhyEgypt />
    <HowItWorks />
    <CompareTable />
    <GuidesSection />
    <ReviewsSection g={g} reviews={reviews} />
    <GuidesLinks guides={guides} />
    <SocialSection g={g} />
    <ContactMap g={g} />
    <section className="container-x pb-16 cv-auto" aria-labelledby="seo-h">
      <div className="max-w-4xl"><h2 id="seo-h" className="h2">Egypt tours planned by a local team</h2>
        <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink/75">
          <p>Egypt Knight Tours offers <Link className="font-semibold underline" href="/tours">Egypt tours and travel packages</Link> for couples, families, friends and solo travellers. Whether you want a <Link className="font-semibold underline" href="/egypt-tours/private-tours-egypt">private Giza pyramids tour</Link>, a day trip through <Link className="font-semibold underline" href="/destinations/cairo">Cairo</Link>, the temples and tombs of <Link className="font-semibold underline" href="/destinations/luxor">Luxor</Link>, or a <Link className="font-semibold underline" href="/egypt-tours/nile-cruises-egypt">Nile cruise</Link> from Luxor to <Link className="font-semibold underline" href="/destinations/aswan">Aswan</Link>, our team plans it around you.</p>
          <p>Every tour shows clear prices and inclusions, hotel pickup where available, and a simple 50% deposit. Add <Link className="font-semibold underline" href="/egypt-tours/cairo-airport-transfers">Cairo airport transfers</Link>, build a custom itinerary with our <Link className="font-semibold underline" href="/plan-my-trip">Egypt trip planner</Link>, or read our <Link className="font-semibold underline" href="/egypt-travel-guide">Egypt travel guides</Link> to choose the best time to visit, understand visas and plan your days.</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">{LANDINGS.map((l) => <Link key={l.slug} href={`/egypt-tours/${l.slug}`} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-bold hover:border-ink">{l.h1}</Link>)}</div></div>
    </section>

    <FaqPanel faq={FAQ} />

    <section className="container-x pb-4 cv-auto">
      <div className="grid overflow-hidden rounded-3xl bg-gold-500 md:grid-cols-2">
        <div className="p-8 sm:p-12"><p className="eyebrow !text-ink">Custom trips</p><h2 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">Your Egypt adventure starts here.</h2><p className="mt-3 max-w-md text-ink/80">Share your dates, group and interests. We'll send a suggested itinerary and a price, usually within one working day.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/plan-my-trip" className="btn btn-dark">Build my Egypt trip</Link><WhatsAppButton href={waLink("Hi Egypt Knight, I'd like a quote for my Egypt trip.")} label="Chat on WhatsApp" /></div></div>
        <SiteImage alt="" destination="luxor" className="relative hidden min-h-[280px] md:block" />
      </div>
    </section>
  </>);
}
