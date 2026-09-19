import Link from "next/link";
import { db, schema as s } from "@/db";
import { listTours } from "@/lib/queries";
import TourCard from "@/components/TourCard";
import WhatsAppButton from "@/components/WhatsAppButton";
import { waLink } from "@/lib/format";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const CATS = [["Day tours", "/tours?category=DAY"], ["Multi-day packages", "/tours?category=MULTI_DAY"], ["Private tours", "/tours?type=private"], ["Family trips", "/tours?audience=FAMILY"], ["Couples & honeymoon", "/tours?audience=COUPLE"], ["Airport transfers", "/tours?category=TRANSFER"]];
export default async function Home() {
  const popular = await listTours({}, 6);
  const dests = await db.select().from(s.destinations);
  const guides = await db.select().from(s.guides).where(eq(s.guides.status, "PUBLISHED")).limit(3);
  return (<>
    <section className="border-b border-ink/10">
      <div className="container-x grid items-center gap-8 py-14 md:grid-cols-2 md:py-20">
        <div>
          <p className="badge">Egypt tours by a local team</p>
          <h1 className="h1 mt-4">Don't just visit Egypt. Experience it properly.</h1>
          <p className="mt-4 max-w-xl text-lg text-ink/70">Pyramids, Luxor, Aswan and the Nile, planned by people who know how to make the trip actually work. Clear prices, easy booking, a real person on WhatsApp.</p>
          <form action="/tours" className="mt-6 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="hero-dest">Destination</label>
            <select id="hero-dest" name="destination" className="input sm:max-w-[220px]"><option value="">Anywhere in Egypt</option>{dests.map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}</select>
            <button className="btn btn-primary">Search tours</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/plan-my-trip" className="btn btn-dark">Plan my trip</Link>
            <WhatsAppButton href={waLink("Hi Egypt Knight, I'd like help choosing an Egypt tour.")} label="Ask us on WhatsApp" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-gold-500 to-gold-700 p-8 text-ink">
          <p className="font-display text-2xl font-bold">First time in Egypt? We've got you.</p>
          <ul className="mt-4 space-y-2 text-sm font-medium"><li>✓ Hotel pickup and clear inclusions</li><li>✓ Free cancellation policy stated on every tour</li><li>✓ Pay a 30% deposit and the rest later</li><li>✓ Real support before and during your trip</li></ul>
        </div>
      </div>
    </section>
    <section className="container-x mt-14"><h2 className="h2">Popular tours</h2><p className="mt-1 text-ink/70">The ones travellers book most.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{popular.map((t) => <TourCard key={t.id} t={t} />)}</div>
      <div className="mt-6 text-center"><Link href="/tours" className="btn btn-outline">See all tours</Link></div></section>
    <section className="container-x mt-16"><h2 className="h2">Pick your kind of trip</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">{CATS.map(([l, h]) => <Link key={h} href={h} className="card p-5 text-center font-semibold hover:border-gold-700">{l}</Link>)}</div></section>
    <section className="container-x mt-16"><h2 className="h2">Where to?</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">{dests.map((d) => <Link key={d.id} href={`/destinations/${d.slug}`} className="card overflow-hidden hover:border-gold-700"><div className="bg-ink p-5 text-white"><p className="font-display text-xl font-bold">{d.name}</p><p className="text-sm text-gold-500">{d.tagline}</p></div></Link>)}</div></section>
    <section className="container-x mt-16 grid gap-4 md:grid-cols-3">
      {[["Local, and easy to reach", "A team on the ground who answers on WhatsApp, before and during your trip."], ["Transparent pricing", "See what's included and excluded on every tour, and your total before you confirm."], ["Trips that fit", "Private, family or shared. Add a transfer, a photographer or another day."]].map(([h, p]) => <div key={h} className="card p-5"><h3 className="font-display text-lg font-bold">{h}</h3><p className="mt-2 text-sm text-ink/70">{p}</p></div>)}</section>
    <section className="container-x mt-16"><h2 className="h2">Plan before you book</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{guides.map((g) => <Link key={g.id} href={`/egypt-travel-guide/${g.slug}`} className="card p-5 hover:border-gold-700"><p className="badge">{g.cluster}</p><h3 className="mt-2 font-display text-lg font-bold">{g.title}</h3><p className="mt-1 text-sm text-ink/70">{g.summary}</p></Link>)}</div></section>
    <section className="container-x mt-16"><div className="card bg-ink p-8 text-center text-white"><h2 className="font-display text-3xl font-bold">Your Egypt adventure starts here.</h2><p className="mt-2 text-white/70">Tell us your dates and who's coming. We'll send a plan and a price.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/plan-my-trip" className="btn btn-primary">Build my Egypt trip</Link><WhatsAppButton href={waLink("Hi Egypt Knight, I'd like a quote for my Egypt trip.")} label="Chat on WhatsApp" /></div></div></section>
  </>);
}
