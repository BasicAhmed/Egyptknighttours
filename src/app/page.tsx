import Link from "next/link";
import { db, schema as s } from "@/db";
import { listTours } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import TourCard from "@/components/TourCard";
import SiteImage from "@/components/SiteImage";
import WhatsAppButton from "@/components/WhatsAppButton";
import { TrustBand, WhyEgypt, HowItWorks, CompareTable, GuidesSection, ReviewsSection, GuidesLinks, SocialSection, ContactMap, FaqPanel, plus, https } from "@/components/home/sections";
import { waLink, money } from "@/lib/format";
import { asc, eq } from "drizzle-orm";

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

export default async function Home() {
  const [all, dRows, guides, g, reviews] = await Promise.all([
    listTours({}, 12), db.select().from(s.destinations),
    db.select().from(s.guides).where(eq(s.guides.status, "PUBLISHED")).limit(3), getSettings(),
    db.select().from(s.testimonials).where(eq(s.testimonials.active, true)).orderBy(asc(s.testimonials.sortOrder), asc(s.testimonials.createdAt)).limit(6),
  ]);
  const popular = all.slice(0, 4); const featured = all[0];
  const dests = ORDER.map((slug) => dRows.find((d) => d.slug === slug)).filter(Boolean) as typeof dRows;
  const hero = (process.env.NEXT_PUBLIC_HERO_IMAGE ?? "").trim() || null;
  const ta = https(g["site.tripadvisorUrl"]);
  return (<>
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="orb orb-a -right-[12%] -top-[22%] h-[620px] w-[620px] sm:h-[760px] sm:w-[760px]" />
        <div className="orb orb-b -bottom-[30%] -left-[14%] h-[560px] w-[560px] sm:h-[700px] sm:w-[700px]" />
        <div className="orb orb-c left-[30%] top-[10%] h-[380px] w-[380px]" />
        <svg className="sun-ring absolute -right-24 top-6 hidden opacity-[.18] lg:block" width="460" height="460" viewBox="0 0 200 200" fill="none" stroke="#C09040" strokeWidth=".5"><circle cx="100" cy="100" r="60" /><circle cx="100" cy="100" r="78" strokeDasharray="1.5 3" />{Array.from({ length: 24 }).map((_, i) => <line key={i} x1="100" y1="12" x2="100" y2="24" transform={`rotate(${i * 15} 100 100)`} />)}</svg>
        <svg className="absolute bottom-0 right-0 hidden opacity-[.09] md:block" width="520" height="200" viewBox="0 0 520 200" fill="none" stroke="#141010" strokeWidth="1.2"><path d="M20 200L150 60l130 140M170 200l110-92 110 92M330 200l70-58 70 58" /></svg>
      </div>
      <div className="container-x relative grid items-center gap-10 pb-14 pt-8 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-14">
        <div className="lg:col-span-6">
          <p className="eyebrow">Egypt tours, planned by locals</p>
          <h1 className="h1 mt-3 !text-[42px] sm:!text-6xl">Don't just visit Egypt. Experience it <span className="relative whitespace-nowrap"><span className="relative z-10">properly.</span><span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-gold-500/70 sm:bottom-2 sm:h-4" /></span></h1>
          <p className="mt-5 max-w-xl text-lg text-ink/75">Egypt's tour team travellers keep coming back to: <b>{plus(g["site.years"])} years</b> of experience, <b>{plus(g["site.tours"])} tours</b> completed, and <b>{plus(g["site.reviews"])} five-star reviews</b> on Tripadvisor.</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold"><span className="flex gap-0.5 text-gold-600">{[0, 1, 2, 3, 4].map((i) => <Star key={i} />)}</span><span>Trusted by thousands of travellers</span>{ta && <a href={ta} target="_blank" rel="noopener noreferrer" className="underline decoration-gold-600 decoration-2 underline-offset-4">See reviews</a>}</div>
          <form action="/tours" className="mt-6 rounded-2xl border border-ink/15 bg-white p-2 shadow-[0_14px_36px_rgba(20,16,16,.12)] sm:flex sm:items-center" role="search">
            <label className="block flex-[1.5] px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Where to</span>
              <select name="destination" className="w-full bg-transparent py-1 text-base font-semibold outline-none"><option value="">Anywhere in Egypt</option>{dests.map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}</select></label>
            <span className="hidden h-10 w-px bg-ink/10 sm:block" />
            <label className="block flex-1 border-t border-ink/10 px-3 py-2 sm:border-0"><span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Travelling as</span>
              <select name="audience" className="w-full bg-transparent py-1 text-base font-semibold outline-none"><option value="">Anyone</option><option value="FAMILY">Family</option><option value="COUPLE">Couple</option><option value="FRIENDS">Friends</option></select></label>
            <button className="btn btn-primary mt-1 w-full sm:mt-0 sm:w-auto sm:px-7">Search tours</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3"><Link href="/plan-my-trip" className="btn btn-dark">Plan my trip</Link><WhatsAppButton href={waLink("Hi Egypt Knight, I'd like help choosing an Egypt tour.")} label="Ask us on WhatsApp" /></div>
        </div>
        <div className="relative lg:col-span-6">
          <SiteImage src={hero} alt="Egypt" destination="giza" className="relative aspect-[4/4.4] rounded-[28px] shadow-[0_24px_60px_rgba(20,16,16,.18)] sm:aspect-[5/5]" />
          {featured && <Link href={`/tours/${featured.slug}`} className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xl transition hover:-translate-y-0.5 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[320px]">
            <span><span className="block text-[11px] font-semibold uppercase tracking-wide text-gold-700">Most booked</span><span className="block font-display text-[17px] font-bold leading-tight">{featured.title}</span><span className="text-sm text-ink/60">From {money(featured.discountPrice ?? featured.price)} per person</span></span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">→</span></Link>}
        </div>
      </div>
    </section>

    <TrustBand g={g} />

    <section className="container-x py-16">
      <div className="flex items-end justify-between"><div><p className="eyebrow">Top experiences</p><h2 className="h2 mt-2">Book these first</h2></div><Link href="/tours" className="hidden text-sm font-bold underline decoration-gold-500 decoration-2 underline-offset-4 sm:block">See all tours</Link></div>
      <div className="no-scrollbar -mx-5 mt-8 flex snap-x gap-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {popular.map((t) => <div key={t.id} className="w-[80%] shrink-0 snap-start sm:w-auto"><TourCard t={t} /></div>)}
      </div>
      <Link href="/tours" className="btn btn-outline mt-6 w-full sm:hidden">See all tours</Link>
    </section>

    <section className="container-x pb-16">
      <p className="eyebrow">Destinations</p><h2 className="h2 mt-2">Where in Egypt?</h2>
      <div className="mt-7 grid auto-rows-[170px] grid-cols-2 gap-3 sm:auto-rows-[210px] md:grid-cols-4">
        {dests.map((d, i) => (
          <Link key={d.id} href={`/destinations/${d.slug}`} className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 md:row-span-2" : i === 5 ? "col-span-2" : ""}`}>
            <SiteImage alt={d.name} destination={d.slug} className="absolute inset-0 transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
            <div className="absolute bottom-0 p-4 text-white"><p className="font-display text-2xl font-bold">{d.name}</p><p className="text-sm text-white/85">{d.tagline}</p></div>
          </Link>))}
        <Link href="/plan-my-trip" className="col-span-2 flex flex-col justify-end rounded-2xl bg-ink p-5 text-white transition hover:bg-black md:col-span-2"><p className="font-display text-2xl font-bold">Not sure where?</p><p className="text-white/70">Tell us your dates and who's coming. We'll suggest a route.</p><span className="mt-3 font-semibold text-gold-500">Build my trip →</span></Link>
      </div>
    </section>

    <WhyEgypt />
    <HowItWorks />
    <CompareTable />
    <GuidesSection />
    <ReviewsSection g={g} reviews={reviews} />
    <GuidesLinks guides={guides} />
    <SocialSection g={g} />
    <ContactMap g={g} />
    <FaqPanel faq={FAQ} />

    <section className="container-x pb-4">
      <div className="grid overflow-hidden rounded-3xl bg-gold-500 md:grid-cols-2">
        <div className="p-8 sm:p-12"><p className="eyebrow !text-ink">Custom trips</p><h2 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">Your Egypt adventure starts here.</h2><p className="mt-3 max-w-md text-ink/80">Share your dates, group and interests. We'll send a suggested itinerary and a price, usually within one working day.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/plan-my-trip" className="btn btn-dark">Build my Egypt trip</Link><WhatsAppButton href={waLink("Hi Egypt Knight, I'd like a quote for my Egypt trip.")} label="Chat on WhatsApp" /></div></div>
        <SiteImage alt="" destination="luxor" className="relative hidden min-h-[280px] md:block" />
      </div>
    </section>
  </>);
}
