"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar, { prettyDate } from "./Calendar";
import Stepper from "./Stepper";
import { money } from "@/lib/format";
import { track } from "./Tracker";

type P = { slug: string; pricingModel: string; maxTravelers: number; isPrivateAvailable: boolean; isGroupAvailable: boolean; minDate: string };
export default function AvailabilityCard(p: P) {
  const router = useRouter();
  const [date, setDate] = useState(""); const [open, setOpen] = useState(false);
  const [adults, setAdults] = useState(2); const [children, setChildren] = useState(0); const [infants, setInfants] = useState(0);
  const [isPrivate, setIsPrivate] = useState(!p.isGroupAvailable);
  const [total, setTotal] = useState<number | null>(null); const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tourSlug: p.slug, adults, children, infants, isPrivate, addonIds: [], couponCode: null, payMode: "FULL" }) });
      const j = await r.json(); if (r.ok) { setTotal(j.quote.total); setErr(null); } else setErr(j.error);
    }, 200);
    return () => clearTimeout(t);
  }, [p.slug, adults, children, infants, isPrivate]);

  function go() {
    if (!date) { setOpen(true); setErr("Choose a date to continue"); return; }
    if (err && err !== "Choose a date to continue") return;
    track("start_booking", { tourSlug: p.slug });
    router.push(`/book/${p.slug}?date=${date}&a=${adults}&c=${children}&i=${infants}&p=${isPrivate ? 1 : 0}`);
  }
  return (
    <div className="rounded-2xl border border-ink/15 bg-white p-5 shadow-[0_10px_30px_rgba(20,16,16,.07)]" id="book">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between rounded-xl border border-ink/20 px-4 py-3 text-left hover:border-ink">
        <span><span className="block text-[11px] font-semibold uppercase tracking-wide text-ink/50">Date</span><span className="font-semibold">{date ? prettyDate(date) : "Select a date"}</span></span><span aria-hidden>▾</span>
      </button>
      {open && <div className="mt-3 rounded-xl border border-ink/10 p-3"><Calendar value={date} min={p.minDate} onChange={(d) => { setDate(d); setOpen(false); setErr(null); }} /></div>}
      <div className="mt-2 divide-y divide-ink/10">
        <Stepper label="Adults" sub="Age 12+" value={adults} min={1} max={p.maxTravelers} onChange={(n) => { setAdults(n); track("add_traveler", { tourSlug: p.slug }); }} />
        <Stepper label="Children" sub="Age 3–11" value={children} min={0} max={p.maxTravelers} onChange={setChildren} />
        <Stepper label="Infants" sub="Under 3, free" value={infants} min={0} max={Math.min(adults, 10)} onChange={setInfants} />
      </div>
      {p.isPrivateAvailable && p.isGroupAvailable && (
        <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tour style">
          {[[false, "Shared"], [true, "Private"]].map(([v, l]) => <button key={String(l)} type="button" role="radio" aria-checked={isPrivate === v} onClick={() => setIsPrivate(v as boolean)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${isPrivate === v ? "border-ink bg-gold-500/25" : "border-ink/20"}`}>{l as string}</button>)}
        </div>)}
      {err && <p role="alert" className="mt-3 text-sm text-red-700">{err}</p>}
      <div className="mt-4 flex items-end justify-between"><span className="text-sm text-ink/60">Total</span><span className="font-display text-2xl font-extrabold">{total != null ? money(total) : "–"}</span></div>
      <button type="button" onClick={go} className="btn btn-primary mt-3 w-full">Check availability</button>
      <p className="mt-2 text-center text-xs text-ink/55">You won't be charged yet. Pay a deposit or reserve now.</p>
    </div>
  );
}
