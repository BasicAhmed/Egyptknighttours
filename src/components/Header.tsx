import Link from "next/link";
import Image from "next/image";
import { waLink } from "@/lib/format";
import MobileMenu from "./MobileMenu";
import HeaderShell from "./HeaderShell";
const nav = [["Tours", "/tours"], ["Destinations", "/destinations"], ["Travel guide", "/egypt-travel-guide"], ["Track booking", "/track"], ["Contact", "/contact"]];
export default function Header() {
  return (
    <HeaderShell>
      <div className="container-x flex h-[68px] items-center gap-6">
        <Link href="/" aria-label="Egypt Knight Tours home" className="shrink-0"><Image src="/logo.webp" alt="Egypt Knight" width={72} height={54} priority className="h-14 w-auto" /></Link>
        <nav aria-label="Main" className="ml-4 hidden gap-7 text-[15px] font-medium md:flex">{nav.map(([l, h]) => <Link key={h} href={h} className="py-2 hover:text-gold-800">{l}</Link>)}</nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <a href={waLink("Hi Egypt Knight, I have a question.")} target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-[42px] !py-2">WhatsApp</a>
          <Link href="/plan-my-trip" className="btn btn-dark !min-h-[42px] !py-2">Plan my trip</Link>
        </div>
        <MobileMenu items={[...nav, ["Plan my trip", "/plan-my-trip"]]} waHref={waLink("Hi Egypt Knight, I have a question.")} />
      </div>
    </HeaderShell>
  );
}
