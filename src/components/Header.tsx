import Link from "next/link";
import Image from "next/image";
const nav = [["Tours", "/tours"], ["Destinations", "/destinations"], ["Travel Guide", "/egypt-travel-guide"], ["Plan my trip", "/plan-my-trip"], ["Contact", "/contact"]];
export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" aria-label="Egypt Knight Tours home" className="flex items-center"><Image src="/logo.webp" alt="Egypt Knight" width={72} height={54} priority className="h-12 w-auto" /></Link>
        <nav aria-label="Main" className="hidden gap-6 text-sm font-medium md:flex">{nav.map(([l, h]) => <Link key={h} href={h} className="hover:text-gold-700">{l}</Link>)}</nav>
        <Link href="/tours" className="btn btn-primary hidden md:inline-flex">Find a tour</Link>
        <details className="relative md:hidden">
          <summary className="btn btn-outline cursor-pointer list-none">Menu</summary>
          <div className="card absolute right-0 mt-2 w-56 p-2">{nav.map(([l, h]) => <Link key={h} href={h} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-gold-500/10">{l}</Link>)}</div>
        </details>
      </div>
    </header>
  );
}
