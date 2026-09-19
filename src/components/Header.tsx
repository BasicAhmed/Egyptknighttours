import Link from "next/link";
import Image from "next/image";
import { waLink } from "@/lib/format";
const nav = [["Tours", "/tours"], ["Destinations", "/destinations"], ["Travel guide", "/egypt-travel-guide"], ["Track booking", "/track"], ["Contact", "/contact"]];
export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur">
      <div className="container-x flex h-[68px] items-center gap-6">
        <Link href="/" aria-label="Egypt Knight Tours home" className="shrink-0"><Image src="/logo.webp" alt="Egypt Knight" width={72} height={54} priority className="h-14 w-auto" /></Link>
        <nav aria-label="Main" className="ml-4 hidden gap-7 text-[15px] font-medium md:flex">{nav.map(([l, h]) => <Link key={h} href={h} className="py-2 hover:text-gold-700">{l}</Link>)}</nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <a href={waLink("Hi Egypt Knight, I have a question.")} target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-[42px] !py-2">WhatsApp</a>
          <Link href="/plan-my-trip" className="btn btn-dark !min-h-[42px] !py-2">Plan my trip</Link>
        </div>
        <details className="relative ml-auto md:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-ink/20" aria-label="Menu"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h14M3 10h14M3 14h14" /></svg></summary>
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-ink/10 bg-white p-2 shadow-xl">
            {[...nav, ["Plan my trip", "/plan-my-trip"]].map(([l, h]) => <Link key={h} href={h} className="block rounded-lg px-3 py-3 text-[15px] font-medium hover:bg-ink/5">{l}</Link>)}
            <a href={waLink("Hi Egypt Knight, I have a question.")} className="btn btn-wa mt-1 w-full">WhatsApp us</a>
          </div>
        </details>
      </div>
    </header>
  );
}
