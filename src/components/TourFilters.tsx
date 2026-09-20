"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type P = { destination?: string; category?: string; audience?: string; type?: string; duration?: string; maxPrice?: string; sort?: string; q?: string };
type Opt = [string, string];
const CATEGORY: Opt[] = [["DAY", "Day tours"], ["MULTI_DAY", "Multi-day packages"], ["NILE_CRUISE", "Nile cruises"], ["TRANSFER", "Airport transfers"]];
const AUDIENCE: Opt[] = [["FAMILY", "Family"], ["COUPLE", "Couples"], ["FRIENDS", "Friends"]];
const STYLE: Opt[] = [["private", "Private"], ["group", "Shared"]];
const DURATION: Opt[] = [["day", "Day trip"], ["multi", "Multi-day"]];
const PRICE: Opt[] = [["50", "Up to $50"], ["100", "Up to $100"], ["200", "Up to $200"], ["500", "Up to $500"], ["1000", "Up to $1,000"]];
const SORT: Opt[] = [["", "Most popular"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"]];
const label = (o: Opt[], v?: string) => o.find((x) => x[0] === v)?.[1];
const href = (p: P) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(p)) if (v) q.set(k, v); const s = q.toString(); return s ? `/tours?${s}` : "/tours"; };

export default function TourFilters({ dests, current, count }: { dests: { slug: string; name: string }[]; current: P; count: number }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [q, setQ] = useState(current.q ?? ""); const [draft, setDraft] = useState<P>(current);
  useEffect(() => { setDraft(current); setQ(current.q ?? ""); }, [current]);
  useEffect(() => {
    if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k); const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open]);
  const activeKeys: (keyof P)[] = ["category", "audience", "type", "duration", "maxPrice"];
  const activeCount = activeKeys.filter((k) => current[k]).length;
  const chips = useMemo(() => [
    current.destination && { k: "destination" as const, text: dests.find((d) => d.slug === current.destination)?.name ?? current.destination },
    current.category && { k: "category" as const, text: label(CATEGORY, current.category) }, current.audience && { k: "audience" as const, text: label(AUDIENCE, current.audience) },
    current.type && { k: "type" as const, text: label(STYLE, current.type) }, current.duration && { k: "duration" as const, text: label(DURATION, current.duration) },
    current.maxPrice && { k: "maxPrice" as const, text: label(PRICE, current.maxPrice) }, current.q && { k: "q" as const, text: `“${current.q}”` },
  ].filter(Boolean) as { k: keyof P; text: string }[], [current, dests]);
  const Chip = ({ group, opts }: { group: keyof P; opts: Opt[] }) => <div className="flex flex-wrap gap-2">{opts.map(([v, l]) => { const on = draft[group] === v; return <button key={v} type="button" aria-pressed={on} onClick={() => setDraft({ ...draft, [group]: on ? "" : v })} className={`rounded-full border px-4 py-2.5 text-[15px] font-semibold transition ${on ? "border-ink bg-ink text-white" : "border-ink/20 bg-white hover:border-ink"}`}>{l}</button>; })}</div>;
  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="border-b border-ink/10 py-5 last:border-0"><h3 className="mb-3 font-display text-base font-extrabold">{title}</h3>{children}</section>;

  return (
    <div>
      <div className="sticky top-[68px] z-30 -mx-5 border-b border-ink/10 bg-white/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 md:mx-0 md:rounded-2xl md:border md:px-4 md:shadow-sm">
        <div className="flex items-center gap-2">
          <form className="relative min-w-0 flex-1" role="search" onSubmit={(e) => { e.preventDefault(); router.push(href({ ...current, q })); }}>
            <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
            <input aria-label="Search tours" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pyramids, Luxor, Nile cruise…" className="input !rounded-xl !py-2.5 !pl-10" />
          </form>
          <button type="button" onClick={() => setOpen(true)} className="relative flex h-[46px] shrink-0 items-center gap-2 rounded-xl border border-ink/25 bg-white px-4 text-[15px] font-bold hover:border-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" /></svg>Filters{activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 text-xs font-extrabold">{activeCount}</span>}
          </button>
          <select aria-label="Sort tours" value={current.sort ?? ""} onChange={(e) => router.push(href({ ...current, sort: e.target.value }))} className="hidden h-[46px] rounded-xl border border-ink/25 bg-white px-3 text-[15px] font-semibold sm:block">{SORT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 md:-mx-4 md:px-4" role="navigation" aria-label="Destinations">
          <Link href={href({ ...current, destination: "" })} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${!current.destination ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/75 hover:border-ink/50"}`}>All Egypt</Link>
          {dests.map((d) => <Link key={d.slug} href={href({ ...current, destination: d.slug })} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${current.destination === d.slug ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/75 hover:border-ink/50"}`}>{d.name}</Link>)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm font-semibold text-ink/60">{count} tour{count === 1 ? "" : "s"}</p>
        {chips.map((c) => <Link key={c.k} href={href({ ...current, [c.k]: "" })} className="inline-flex items-center gap-1.5 rounded-full border border-gold-600/50 bg-gold-500/20 px-3 py-1.5 text-sm font-semibold hover:bg-gold-500/35" aria-label={`Remove filter ${c.text}`}>{c.text}<span aria-hidden>×</span></Link>)}
        {chips.length > 0 && <Link href="/tours" className="text-sm font-bold underline decoration-gold-600 decoration-2 underline-offset-4">Clear all</Link>}
        <select aria-label="Sort tours" value={current.sort ?? ""} onChange={(e) => router.push(href({ ...current, sort: e.target.value }))} className="ml-auto rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-semibold sm:hidden">{SORT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-stretch sm:justify-end" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Filter tours" className="flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-h-none sm:w-[440px] sm:rounded-none">
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><h2 className="font-display text-xl font-extrabold">Filters</h2><button type="button" aria-label="Close filters" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-xl hover:bg-ink/5">×</button></div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5">
              <Sec title="Type of tour"><Chip group="category" opts={CATEGORY} /></Sec>
              <Sec title="Who's travelling"><Chip group="audience" opts={AUDIENCE} /></Sec>
              <Sec title="Private or shared"><Chip group="type" opts={STYLE} /></Sec>
              <Sec title="How long"><Chip group="duration" opts={DURATION} /></Sec>
              <Sec title="Price per person"><Chip group="maxPrice" opts={PRICE} /></Sec>
            </div>
            <div className="flex gap-3 border-t border-ink/10 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              <button type="button" onClick={() => setDraft({ ...draft, category: "", audience: "", type: "", duration: "", maxPrice: "" })} className="btn btn-outline">Clear</button>
              <button type="button" onClick={() => { setOpen(false); router.push(href({ ...current, ...draft, q })); }} className="btn btn-primary flex-1">Show tours</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
