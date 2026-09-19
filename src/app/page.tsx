import Link from "next/link";
import { db, schema as s } from "@/db";
import { listTours } from "@/lib/queries";
import TourCard from "@/components/TourCard";
import SiteImage from "@/components/SiteImage";
import WhatsAppButton from "@/components/WhatsAppButton";
import { waLink, money } from "@/lib/format";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const ORDER = ["giza", "luxor", "cairo", "aswan", "alexandria", "hurghada"];
const Check = () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0 text-gold-700"><circle cx="10" cy="10" r="9" fill="currentColor" opacity=".18" /><path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const FAQ = [
  ["How do I book?", "Choose a tour, pick your date and group size, and confirm. We then message you on WhatsApp or email to confirm details and send a secure payment link."],
  ["Do I have to pay everything now?", "No. Most tours let you pay a 30% deposit and settle the rest later. If you travel 7+ days out, some tours let you reserve now and pay later."],
  ["Is hotel pickup included?", "For most Cairo, Giza and Luxor tours, yes. Each tour page lists exactly what's included and what isn't."],
  ["Can I change or cancel?", "Every tour page states its cancellation policy. Message us on WhatsApp if your plans change and we'll help."],
  ["Can you build a custom trip?", "Yes. Tell us your dates, group and interests and we'll send an itinerary and a price."],
];
export default async function Home() {
  const all = await listTours({}, 12);
  const popular = all.slice(0, 4);
  const featured = all[0];
  const dRows = await db.select().from(s.destinations);
  const dests = ORDER.map((slug) => dRows.find((d) => d.slug === slug)).filter(Boolean) as typeof dRows;
  const guides = await db.select().from(s.guides).where(eq(s.guides.status, "PUBLISHED")).limit(3);
  const hero = (process.env.NEXT_PUBLIC_HERO_IMAGE ?? "").trim() || null;
  return (<>
    <section className="container-x grid items-center gap-10 pb-14 pt-8 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-14">
      <div className="lg:col-span-6">
        <p className="eyebrow">Egypt tours, planned by locals</p>
        <h1 className="h1 mt-3 !text-[42px] sm:!text-6xl">Don't just visit Egypt. Experience it <span className="relative whitespace-nowrap"><span className="relative z-10">properly.</span><span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-gold-500/70 sm:bottom-2 sm:h-4" /></span></h1>
        <p className="mt-5 max-w-lg text-lg text-ink/70">Pyramids, Luxor, Aswan and the Nile, arranged by people who know how to make the trip actually work.</p>
        <form action="/tours" className="mt-7 rounded-2xl border border-ink/15 bg-white p-2 shadow-[0_10px_30px_rgba(20,16,16,.08)] sm:flex sm:items-center" role="search">
          <label className="block flex-[1.5] px-3 py-2"><span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Where to</span>
            <select name="destination" className="w-full bg-transparent py-1 text-base font-semibold outline-none"><option value="">Anywhere in Egypt</option>{dests.map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}</select></label>
          <span className="hidden h-10 w-px bg-ink/10 sm:block" />
          <label className="block flex-1 border-t border-ink/10 px-3 py-2 sm:border-0"><span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Travelling as</span>
            <select name="audience" className="w-full bg-transparent py-1 text-base font-semibold outline-none"><option value="">Anyone</option><option value="FAMILY">Family</option><option value="COUPLE">Couple</option><option value="FRIENDS">Friends</option></select></label>
          <button className="btn btn-primary mt-1 w-full sm:mt-0 sm:w-auto sm:px-7">Search tours</button>
        </form>
        <ul className="mt-6 grid gap-2.5 text-[15px] text-ink/80 sm:grid-cols-2">
          {["Hotel pickup on most tours", "Pay a 30% deposit, rest later", "Clear inclusions and prices", "A real person on WhatsApp"].map((t) => <li key={t} className="flex items-center gap-2"><Check />{t}</li>)}
        </ul>
      </div>
      <div className="relative lg:col-span-6">
        <SiteImage src={hero} alt="Egypt" destination="giza" className="relative aspect-[4/4.4] rounded-[28px] sm:aspect-[5/5]" />
        {featured && <Link href={`/tours/${featured.slug}`} className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xl transition hover:-translate-y-0.5 sm:inset-x-auto sm:left-5 sm:bottom-5 sm:w-[320px]">
          <span><span className="block text-[11px] font-semibold uppercase tracking-wide text-gold-700">Most booked</span><span className="block font-display text-[17px] font-bold leading-tight">{featured.title}</span><span className="text-sm text-ink/60">From {money(featured.discountPrice ?? featured.price)} per person</span></span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">→</span></Link>}
      </div>
    </section>

    <section className="container-x pb-16">
      <div className="flex items-end justify-between"><div><p className="eyebrow">Top experiences</p><h2 className="h2 mt-2">Book these first</h2></div><Link href="/tours" className="hidden text-sm font-semibold underline decoration-gold-500 decoration-2 underline-offset-4 sm:block">See all tours</Link></div>
      <div className="no-scrollbar -mx-5 mt-7 flex snap-x gap-5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {popular.map((t) => <div key={t.id} className="w-[76%] shrink-0 snap-start sm:w-auto"><TourCard t={t} /></div>)}
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

    <section className="border-y border-ink/10 py-16">
      <div className="container-x">
        <p className="eyebrow">How it works</p><h2 className="h2 mt-2">Simple, from first click to the pyramids</h2>
        <ol className="mt-9 grid gap-8 md:grid-cols-3">
          {[["Pick a tour", "Filter by destination, duration and price. Every page shows what's included and what isn't."], ["Choose date and group", "See your total before you confirm. Pay a 30% deposit and settle the rest later."], ["We handle the rest", "Pickup details and updates come by WhatsApp. A real person answers when you have a question."]].map(([h, p], i) => (
            <li key={h}><span className="font-display text-6xl font-extrabold text-gold-500">{i + 1}</span><h3 className="mt-2 font-display text-xl font-bold">{h}</h3><p className="mt-1 text-ink/70">{p}</p></li>))}
        </ol>
      </div>
    </section>

    <section className="container-x grid gap-10 py-16 lg:grid-cols-2 lg:gap-16">
      <div><p className="eyebrow">Read before you go</p><h2 className="h2 mt-2">Straight answers for first-timers</h2>
        <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
          {guides.map((g) => <li key={g.id}><Link href={`/egypt-travel-guide/${g.slug}`} className="group flex items-center justify-between gap-4 py-4"><span><span className="block text-xs font-medium uppercase tracking-wide text-ink/50">{g.cluster}</span><span className="font-display text-lg font-bold group-hover:underline">{g.title}</span></span><span className="text-xl">→</span></Link></li>)}
        </ul></div>
      <div><p className="eyebrow">Good to know</p><h2 className="h2 mt-2">Questions we get a lot</h2>
        <div className="mt-6 divide-y divide-ink/10 border-y border-ink/10">{FAQ.map(([q, a]) => <details key={q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<span className="text-xl transition group-open:rotate-45">+</span></summary><p className="mt-2 text-ink/70">{a}</p></details>)}</div></div>
    </section>

    <section className="container-x pb-4">
      <div className="grid overflow-hidden rounded-3xl bg-ink text-white md:grid-cols-2">
        <div className="p-8 sm:p-12"><p className="eyebrow !text-gold-500">Custom trips</p><h2 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">Your Egypt adventure starts here.</h2><p className="mt-3 max-w-md text-white/70">Share your dates, group and interests. We'll send a suggested itinerary and a price, usually within one working day.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/plan-my-trip" className="btn btn-primary">Build my Egypt trip</Link><WhatsAppButton href={waLink("Hi Egypt Knight, I'd like a quote for my Egypt trip.")} label="Chat on WhatsApp" /></div></div>
        <SiteImage alt="" destination="luxor" className="relative hidden min-h-[280px] md:block" />
      </div>
    </section>
  </>);
}
