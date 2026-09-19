import Link from "next/link";
export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-ink text-white">
      <div className="container-x grid gap-8 py-12 sm:grid-cols-3">
        <div><p className="font-display text-lg font-bold">Egypt Knight Tours</p><p className="mt-2 text-sm text-white/70">See Egypt like a tourist. Experience it like a local.</p>
          <p className="mt-3 text-xs text-white/50">Address, licence and registration details: to be added by Egypt Knight.</p></div>
        <div className="text-sm"><p className="font-semibold text-gold-500">Explore</p><ul className="mt-2 space-y-1 text-white/80">
          <li><Link href="/tours">All tours</Link></li><li><Link href="/destinations">Destinations</Link></li><li><Link href="/egypt-travel-guide">Egypt travel guide</Link></li><li><Link href="/plan-my-trip">Build my Egypt trip</Link></li></ul></div>
        <div className="text-sm"><p className="font-semibold text-gold-500">Help</p><ul className="mt-2 space-y-1 text-white/80">
          <li><Link href="/contact">Contact</Link></li><li><Link href="/faq">FAQ</Link></li><li><Link href="/admin/login" rel="nofollow">Staff login</Link></li></ul></div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-white/50">© {new Date().getFullYear()} Egypt Knight Tours</p>
    </footer>
  );
}
