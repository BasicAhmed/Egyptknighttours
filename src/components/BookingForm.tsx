"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { track } from "./Tracker";
import type { Quote } from "@/lib/pricing";

type Addon = { id: string; name: string; description: string; price: number; unit: string };
type Props = { slug: string; title: string; pricingModel: string; maxTravelers: number; isPrivateAvailable: boolean; isGroupAvailable: boolean; addons: Addon[]; minDate: string };

export default function BookingForm(p: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2); const [children, setChildren] = useState(0); const [infants, setInfants] = useState(0);
  const [isPrivate, setIsPrivate] = useState(!p.isGroupAvailable);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [coupon, setCoupon] = useState(""); const [payMode, setPayMode] = useState<"DEPOSIT" | "FULL" | "PAY_LATER">("DEPOSIT");
  const [f, setF] = useState({ name: "", email: "", whatsapp: "", country: "", hotel: "", specialRequests: "", dietary: "", accessibility: "", consent: false });
  const [quote, setQuote] = useState<Quote | null>(null); const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const body = useMemo(() => ({ tourSlug: p.slug, adults, children, infants, isPrivate, addonIds, couponCode: coupon || null, payMode }), [p.slug, adults, children, infants, isPrivate, addonIds, coupon, payMode]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (r.ok) { setQuote(j.quote); setCouponMsg(j.couponMessage); setError(null); } else setError(j.error);
    }, 250);
    return () => clearTimeout(t);
  }, [body]);

  const markStart = () => { if (!started.current) { started.current = true; track("start_booking", { tourSlug: p.slug }); } };
  const people = adults + children;
  const stepper = (label: string, sub: string, v: number, set: (n: number) => void, min: number, max: number) => (
    <div className="flex items-center justify-between py-2">
      <div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-ink/60">{sub}</p></div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer ${label}`} className="btn btn-outline !h-11 !w-11 !p-0" onClick={() => { markStart(); set(Math.max(min, v - 1)); track("add_traveler", { tourSlug: p.slug }); }}>−</button>
        <span className="w-6 text-center font-semibold" aria-live="polite">{v}</span>
        <button type="button" aria-label={`More ${label}`} className="btn btn-outline !h-11 !w-11 !p-0" onClick={() => { markStart(); set(Math.min(max, v + 1)); track("add_traveler", { tourSlug: p.slug }); }}>+</button>
      </div>
    </div>
  );

  async function submit() {
    setBusy(true); setError(null);
    track("start_checkout", { tourSlug: p.slug });
    const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, travelDate: date, name: f.name, email: f.email, whatsapp: f.whatsapp, country: f.country || undefined, hotel: f.hotel || undefined, specialRequests: f.specialRequests || undefined, dietary: f.dietary || undefined, accessibility: f.accessibility || undefined, consentMarketing: f.consent, source: document.referrer ? new URL(document.referrer).hostname : "direct" }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) { setError(j.error ?? "Something went wrong"); return; }
    track("purchase", { tourSlug: p.slug, props: { value: j.total } });
    router.push(`/booking/confirmation/${j.ref}`);
  }
  const next1 = () => { if (!date) return setError("Pick a date to continue"); if (error) return; setStep(2); };
  const next2 = () => { if (error) return; setStep(3); };
  const valid3 = f.name.trim().length > 1 && /\S+@\S+\.\S+/.test(f.email) && f.whatsapp.trim().length >= 5;

  return (
    <div className="card p-5" id="book">
      <ol className="mb-4 flex gap-2 text-xs font-semibold" aria-label="Booking progress">
        {["Trip", "Options", "Your details"].map((l, i) => <li key={l} className={`flex-1 rounded-full px-2 py-1.5 text-center ${step === i + 1 ? "bg-ink text-white" : step > i + 1 ? "bg-gold-500 text-ink" : "bg-ink/5 text-ink/60"}`}>{i + 1}. {l}</li>)}
      </ol>
      {step === 1 && <div>
        <label className="label" htmlFor="date">Travel date</label>
        <input id="date" type="date" min={p.minDate} value={date} onChange={(e) => { markStart(); setDate(e.target.value); setError(null); }} className="input" />
        <div className="mt-2 divide-y divide-ink/10">
          {p.pricingModel === "PER_GROUP" ? <p className="py-2 text-sm text-ink/70">Group price covers up to {p.maxTravelers} travelers.</p> : null}
          {stepper("Adults", "Age 12+", adults, setAdults, 1, p.maxTravelers)}
          {stepper("Children", "Age 3–11", children, setChildren, 0, p.maxTravelers)}
          {stepper("Infants", "Under 3, free", infants, setInfants, 0, Math.min(adults, 10))}
        </div>
        {p.isPrivateAvailable && p.isGroupAvailable && (
          <fieldset className="mt-3 grid grid-cols-2 gap-2"><legend className="label">Tour style</legend>
            {[[false, "Shared"], [true, "Private"]].map(([v, l]) => <label key={String(l)} className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold ${isPrivate === v ? "border-ink bg-gold-500/20" : "border-ink/20"}`}><input type="radio" className="sr-only" name="style" checked={isPrivate === v} onChange={() => setIsPrivate(v as boolean)} />{l as string}</label>)}
          </fieldset>)}
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={next1}>Continue</button>
      </div>}
      {step === 2 && <div>
        {p.addons.length > 0 && <fieldset><legend className="label">Popular add-ons</legend><div className="space-y-2">{p.addons.map((a) => (
          <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${addonIds.includes(a.id) ? "border-ink bg-gold-500/10" : "border-ink/20"}`}>
            <input type="checkbox" className="mt-1 h-5 w-5 accent-black" checked={addonIds.includes(a.id)} onChange={(e) => { if (e.target.checked) track("add_upsell", { tourSlug: p.slug, props: { addon: a.name } }); setAddonIds(e.target.checked ? [...addonIds, a.id] : addonIds.filter((x) => x !== a.id)); }} />
            <span className="flex-1 text-sm"><b>{a.name}</b><br /><span className="text-ink/60">{a.description}</span></span>
            <span className="text-sm font-semibold">{money(a.price)}{a.unit === "PER_PERSON" ? "/pp" : ""}</span>
          </label>))}</div></fieldset>}
        <label className="label mt-4" htmlFor="coupon">Coupon code</label>
        <input id="coupon" className="input uppercase" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Optional" />
        {couponMsg && <p className="mt-1 text-sm text-red-700">{couponMsg}</p>}
        <fieldset className="mt-4"><legend className="label">Payment</legend><div className="space-y-2">
          {([["DEPOSIT", "Pay 30% deposit now, rest later"], ["FULL", "Pay in full now"], ["PAY_LATER", "Reserve now, pay later (7+ days before travel)"]] as const).map(([v, l]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${payMode === v ? "border-ink bg-gold-500/10" : "border-ink/20"}`}><input type="radio" name="pay" className="accent-black" checked={payMode === v} onChange={() => setPayMode(v)} />{l}</label>))}</div></fieldset>
        <div className="mt-4 flex gap-2"><button className="btn btn-outline" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary flex-1" onClick={next2}>Continue</button></div>
      </div>}
      {step === 3 && <div className="space-y-3">
        <div><label className="label" htmlFor="name">Full name</label><input id="name" className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="input" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label" htmlFor="wa">WhatsApp number (with country code)</label><input id="wa" type="tel" className="input" autoComplete="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
        <div><label className="label" htmlFor="hotel">Hotel or pickup address</label><input id="hotel" className="input" value={f.hotel} onChange={(e) => setF({ ...f, hotel: e.target.value })} placeholder="If you don't know yet, leave blank" /></div>
        <div><label className="label" htmlFor="req">Special requests, dietary or accessibility needs</label><textarea id="req" className="input" rows={3} value={f.specialRequests} onChange={(e) => setF({ ...f, specialRequests: e.target.value })} /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 accent-black" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />Send me useful Egypt travel tips and offers. Unsubscribe any time.</label>
        <div className="flex gap-2"><button className="btn btn-outline" onClick={() => setStep(2)}>Back</button><button disabled={!valid3 || busy} className="btn btn-primary flex-1 disabled:opacity-50" onClick={submit}>{busy ? "Booking…" : "Confirm booking"}</button></div>
        <p className="text-xs text-ink/60">No card is taken on this page. We confirm your booking and send a secure payment link.</p>
      </div>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {quote && (
        <div className="mt-5 border-t border-ink/10 pt-4 text-sm" aria-live="polite">
          {quote.lines.map((l, i) => <div key={i} className="flex justify-between py-0.5"><span className="text-ink/70">{l.label}</span><span>{l.amount < 0 ? "−" : ""}{money(Math.abs(l.amount))}</span></div>)}
          <div className="mt-2 flex justify-between text-base font-bold"><span>Total ({people} traveler{people === 1 ? "" : "s"})</span><span>{money(quote.total)}</span></div>
          {payModeText(payMode, quote)}
        </div>)}
    </div>
  );
}
function payModeText(m: string, q: Quote) {
  if (m === "PAY_LATER") return <p className="mt-1 text-xs text-ink/60">Nothing to pay today. Full amount due before travel.</p>;
  if (m === "FULL") return <p className="mt-1 text-xs text-ink/60">Due now: {money(q.deposit)}</p>;
  return <p className="mt-1 text-xs text-ink/60">Deposit now: {money(q.deposit)} · Balance later: {money(q.dueLater)}</p>;
}
