"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Opens and closes with the button, closes when you tap outside, press Escape, or go to a page.
export default function MobileMenu({ items, waHref }: { items: string[][]; waHref: string }) {
  const [open, setOpen] = useState(false); const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k); const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open]);
  return (
    <div className="ml-auto md:hidden">
      <button type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)} className="relative z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-ink/20 bg-white">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 6h14M3 10h14M3 14h14" />}</svg>
      </button>
      {open && <>
        <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default bg-ink/40" />
        <div id="mobile-menu" role="dialog" aria-label="Menu" className="fixed inset-x-3 top-[76px] z-50 rounded-2xl border border-ink/10 bg-white p-2 shadow-2xl">
          {items.map(([l, h]) => <Link key={h} href={h} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3.5 text-[16px] font-semibold hover:bg-ink/5">{l}</Link>)}
          <a href={waHref} onClick={() => setOpen(false)} target="_blank" rel="noopener noreferrer" className="btn btn-wa mt-1 w-full">WhatsApp us</a>
        </div>
      </>}
    </div>
  );
}
