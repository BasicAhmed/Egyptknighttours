import Link from "next/link";
import { LANDINGS } from "@/lib/landing";
import BuilderCredit from "./BuilderCredit";
const DESTS: [string, string][] = [["Cairo", "cairo"], ["Giza pyramids", "giza"], ["Luxor", "luxor"], ["Aswan", "aswan"], ["Alexandria", "alexandria"], ["Hurghada", "hurghada"]];
export default async function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-ink text-white">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="font-display text-lg font-bold">Egypt Knight Tours</p><p className="mt-2 text-sm text-white/70">Egypt tours by a local team: private pyramids tours, Nile cruises, Cairo, Luxor and Aswan packages.</p>
          <p className="mt-3 text-xs text-white/50">Address, licence and registration details: to be added by Egypt Knight.</p></div>
        <nav aria-label="Egypt tours" className="text-sm"><p className="font-semibold text-gold-500">Egypt tours</p><ul className="mt-2 space-y-1 text-white/80">{LANDINGS.map((l) => <li key={l.slug}><Link href={`/egypt-tours/${l.slug}`}>{l.h1}</Link></li>)}<li><Link href="/tours">All Egypt tours</Link></li></ul></nav>
        <nav aria-label="Destinations" className="text-sm"><p className="font-semibold text-gold-500">Destinations</p><ul className="mt-2 space-y-1 text-white/80">{DESTS.map(([n, s]) => <li key={s}><Link href={`/destinations/${s}`}>{n} tours</Link></li>)}<li><Link href="/egypt-travel-guide">Egypt travel guide</Link></li></ul></nav>
        <nav aria-label="Help" className="text-sm"><p className="font-semibold text-gold-500">Help</p><ul className="mt-2 space-y-1 text-white/80"><li><Link href="/plan-my-trip">Build my Egypt trip</Link></li><li><Link href="/track">Track my booking</Link></li><li><Link href="/contact">Contact</Link></li><li><Link href="/faq">FAQ</Link></li><li><Link href="/terms">Booking terms</Link></li><li><Link href="/privacy-policy">Privacy policy</Link></li><li><Link href="/admin/login" rel="nofollow">Staff login</Link></li></ul></nav>
      </div>
      <div className="border-t border-white/10 py-4"><div className="container-x flex flex-col items-center justify-between gap-2 text-xs text-white/60 sm:flex-row"><p>© {new Date().getFullYear()} Egypt Knight Tours. All rights reserved.</p><BuilderCredit className="" /></div></div>
    </footer>
  );
}
