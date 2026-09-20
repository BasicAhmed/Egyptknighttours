"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Calendar, { prettyDate, tomorrowISO, fromISO } from "./Calendar";
import Stepper from "./Stepper";
import SiteImage from "./SiteImage";
import { track } from "./Tracker";
import { money } from "@/lib/format";
import { COUNTRIES } from "@/lib/countries";
import { DEPOSIT_PERCENT, type Quote } from "@/lib/pricing";

type Addon = { id: string; name: string; description: string; price: number; unit: string };
type Tour = { slug: string; title: string; imageUrl: string | null; destinationSlug: string; destinationName: string; pricingModel: string; maxTravelers: number; isPrivateAvailable: boolean; isGroupAvailable: boolean; pickupInfo: string; cancellationPolicy: string; durationLabel: string };
type PayMode = "DEPOSIT" | "FULL" | "PAY_LATER";
const STEPS = ["Trip", "Extras", "Your details", "Review"];
const emailOk = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

export default function BookingWizard({ tour, addons, initial }: { tour: Tour; addons: Addon[]; initial: { date: string; adults: number; children: number; infants: number; isPrivate: boolean } }) {
  const router = useRouter();
  const minDate = useMemo(() => tomorrowISO(), []);
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(initial.date >= minDate ? initial.date : "");
  const [adults, setAdults] = useState(initial.adults); const [children, setChildren] = useState(initial.children); const [infants, setInfants] = useState(initial.infants);
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [coupon, setCoupon] = useState(""); const [appliedCoupon, setAppliedCoupon] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("DEPOSIT");
  const [c, setC] = useState({ name: "", email: "", whatsapp: "", nationality: "", hotel: "", pickupNotes: "", requests: "", dietary: "", accessibility: "" });
  const [others, setOthers] = useState<string[]>([]);
  const [consent, setConsent] = useState(false); const [terms, setTerms] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null); const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const abandonSent = useRef(false); const top = useRef<HTMLDivElement>(null);
  const people = adults + children;
  const daysAway = date ? Math.round((fromISO(date).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000) : 0;
  const payLaterOk = daysAway >= 7;

  // restore contact details after a refresh
  useEffect(() => { try { const d = sessionStorage.getItem("egk_draft"); if (d) { const j = JSON.parse(d); setC((x) => ({ ...x, ...j.c })); setConsent(!!j.consent); } } catch {} }, []);
  useEffect(() => { try { sessionStorage.setItem("egk_draft", JSON.stringify({ c, consent })); } catch {} }, [c, consent]);
  const firstRender = useRef(true);
  useEffect(() => { if (firstRender.current) { firstRender.current = false; return; } top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [step]);
  useEffect(() => { if (!payLaterOk && payMode === "PAY_LATER") setPayMode("DEPOSIT"); }, [payLaterOk, payMode]);

  const body = useMemo(() => ({ tourSlug: tour.slug, adults, children, infants, isPrivate, addonIds, couponCode: appliedCoupon || null, payMode }), [tour.slug, adults, children, infants, isPrivate, addonIds, appliedCoupon, payMode]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (r.ok) { setQuote(j.quote); setCouponMsg(j.couponMessage); setError(null); } else setError(j.error);
    }, 200);
    return () => clearTimeout(t);
  }, [body]);

  const validStep = (n: number) => {
    if (n === 1) return date ? null : "Choose a travel date to continue";
    if (n === 3) {
      if (c.name.trim().length < 2) return "Please enter your full name";
      if (!emailOk(c.email)) return "Please enter a valid email";
      if (c.whatsapp.replace(/\D/g, "").length < 6) return "Please enter your WhatsApp number with country code";
      if (!c.nationality) return "Please choose your nationality";
    }
    if (n === 4 && !terms) return "Please accept the booking terms to continue";
    return null;
  };
  function next() {
    const v = validStep(step); if (v) { setError(v); return; }
    if (error && step === 1) return;
    setError(null);
    if (step === 3 && !abandonSent.current) {
      abandonSent.current = true; // contact details are in: save a CRM task in case they don't finish
      fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "ABANDONED", name: c.name, email: c.email, whatsapp: c.whatsapp, country: c.nationality || undefined, travelDates: date, travelers: people + infants, toursViewed: tour.slug, source: "checkout" }) }).catch(() => {});
    }
    if (step === 2) track("start_checkout", { tourSlug: tour.slug });
    setStep(step + 1);
  }
  function goTo(n: number) { if (n < step) { setError(null); setStep(n); } }
  async function submit() {
    const v = validStep(3) ?? validStep(4); if (v) { setError(v); return; }
    setBusy(true); setError(null);
    const noteBits = [c.pickupNotes && `Pickup notes: ${c.pickupNotes}`, c.requests].filter(Boolean).join("\n");
    const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, travelDate: date, name: c.name, email: c.email, whatsapp: c.whatsapp, nationality: c.nationality, hotel: c.hotel || undefined, pickupLocation: c.pickupNotes || undefined, specialRequests: noteBits || undefined, dietary: c.dietary || undefined, accessibility: c.accessibility || undefined, travelerNames: [c.name, ...others], consentMarketing: consent, source: document.referrer ? new URL(document.referrer).hostname : "direct" }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) { setError(j.error ?? "Something went wrong. Please try again."); return; }
    track("purchase", { tourSlug: tour.slug, props: { value: j.total } });
    try { sessionStorage.removeItem("egk_draft"); } catch {}
    router.push(`/booking/confirmation/${j.ref}?t=${j.token}`);
  }

  const dueNow = quote ? (payMode === "FULL" ? quote.total : payMode === "DEPOSIT" ? quote.deposit : 0) : 0;
  const Summary = () => (
    <div className="rounded-2xl border border-ink/15 bg-white p-5">
      <div className="flex gap-3">
        <SiteImage src={tour.imageUrl} alt="" destination={tour.destinationSlug} className="relative h-20 w-24 shrink-0 rounded-xl" />
        <div><p className="font-display text-[17px] font-bold leading-snug">{tour.title}</p><p className="mt-1 text-xs text-ink/65">{tour.destinationName} · {tour.durationLabel}</p></div>
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-ink/65">Date</dt><dd className="text-right font-medium">{date ? prettyDate(date) : "Not chosen"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink/65">Travelers</dt><dd className="text-right font-medium">{adults} adult{adults > 1 ? "s" : ""}{children ? `, ${children} child${children > 1 ? "ren" : ""}` : ""}{infants ? `, ${infants} infant${infants > 1 ? "s" : ""}` : ""}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink/65">Style</dt><dd className="font-medium">{isPrivate ? "Private" : "Shared"}</dd></div>
      </dl>
      {quote && <div className="mt-4 border-t border-ink/10 pt-3 text-sm" aria-live="polite">
        {quote.lines.map((l, i) => <div key={i} className="flex justify-between gap-3 py-0.5"><span className="text-ink/65">{l.label}</span><span className={l.amount < 0 ? "font-medium text-[#1a7f45]" : ""}>{l.amount < 0 ? "−" : ""}{money(Math.abs(l.amount))}</span></div>)}
        <div className="mt-2 flex items-baseline justify-between border-t border-ink/10 pt-3"><span className="font-semibold">Total</span><span className="font-display text-2xl font-extrabold">{money(quote.total)}</span></div>
        <p className="mt-1 text-xs text-ink/65">{payMode === "PAY_LATER" ? "Nothing due today." : `Due today: ${money(dueNow)}${payMode === "DEPOSIT" ? ` · Balance later: ${money(quote.dueLater)}` : ""}`}</p>
      </div>}
    </div>
  );
  const styleBtn = (v: boolean, label: string, sub: string) => (
    <button type="button" role="radio" aria-checked={isPrivate === v} onClick={() => setIsPrivate(v)} className={`rounded-xl border p-4 text-left ${isPrivate === v ? "border-ink bg-gold-500/20" : "border-ink/20 hover:border-ink"}`}><span className="block font-semibold">{label}</span><span className="text-xs text-ink/65">{sub}</span></button>
  );
  const field = (id: string, label: string, val: string, set: (v: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="label" htmlFor={id}>{label}</label><input id={id} className="input" value={val} onChange={(e) => set(e.target.value)} {...props} /></div>
  );

  return (
    <div className="container-x scroll-mt-24 pb-36 pt-6 lg:pb-14" ref={top}>
      <Link href={`/tours/${tour.slug}`} className="text-sm font-medium text-ink/65 hover:text-ink">← Back to tour</Link>
      <h1 className="h2 mt-2">{tour.title}</h1>
      <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Booking progress">
        {STEPS.map((l, i) => { const n = i + 1, done = n < step, cur = n === step; return (
          <li key={l}><button type="button" onClick={() => goTo(n)} disabled={!done} aria-current={cur ? "step" : undefined} className="block w-full text-left">
            <span className={`block h-1.5 rounded-full ${done ? "bg-gold-500" : cur ? "bg-ink" : "bg-ink/10"}`} />
            <span className={`mt-1.5 block text-xs font-semibold sm:text-sm ${cur ? "text-ink" : done ? "text-ink/80" : "text-ink/65"}`}><span className="hidden sm:inline">{n}. </span>{l}</span></button></li>); })}
      </ol>

      <details className="mt-5 rounded-2xl border border-ink/15 lg:hidden"><summary className="flex cursor-pointer list-none items-center justify-between p-4 font-semibold">Order summary<span>{quote ? money(quote.total) : ""} ▾</span></summary><div className="px-1 pb-1"><Summary /></div></details>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
        <div key={step} className="step-in">
          {step === 1 && <section aria-labelledby="s1">
            <h2 id="s1" className="font-display text-2xl font-bold">When are you traveling?</h2>
            <div className="mt-4 rounded-2xl border border-ink/15 p-4 sm:p-5"><Calendar value={date} min={minDate} onChange={(d) => { setDate(d); setError(null); }} /></div>
            {date && <p className="mt-3 text-sm font-medium">Selected: {prettyDate(date)}</p>}
            <h2 className="mt-8 font-display text-2xl font-bold">Who's coming?</h2>
            <div className="mt-2 divide-y divide-ink/10 rounded-2xl border border-ink/15 px-4">
              {tour.pricingModel === "PER_GROUP" && <p className="py-3 text-sm text-ink/65">The group price covers up to {tour.maxTravelers} travelers.</p>}
              <Stepper label="Adults" sub="Age 12+" value={adults} min={1} max={tour.maxTravelers} onChange={(n) => { setAdults(n); track("add_traveler", { tourSlug: tour.slug }); }} />
              <Stepper label="Children" sub="Age 3–11, discounted" value={children} min={0} max={tour.maxTravelers} onChange={setChildren} />
              <Stepper label="Infants" sub="Under 3, free" value={infants} min={0} max={Math.min(adults, 10)} onChange={setInfants} />
            </div>
            {tour.isPrivateAvailable && tour.isGroupAvailable && <>
              <h2 className="mt-8 font-display text-2xl font-bold">Tour style</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tour style">{styleBtn(false, "Shared", "Join a small group, best value")}{styleBtn(true, "Private", "Just your group, your pace")}</div></>}
          </section>}

          {step === 2 && <section aria-labelledby="s2">
            <h2 id="s2" className="font-display text-2xl font-bold">Make it even better</h2>
            <p className="mt-1 text-ink/65">Optional extras. Add anything you like, or skip ahead.</p>
            <div className="mt-4 space-y-3">{addons.map((a) => { const on = addonIds.includes(a.id); return (
              <label key={a.id} className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 ${on ? "border-ink bg-gold-500/15" : "border-ink/15 hover:border-ink"}`}>
                <input type="checkbox" className="mt-1 h-5 w-5 accent-black" checked={on} onChange={(e) => { if (e.target.checked) track("add_upsell", { tourSlug: tour.slug, props: { addon: a.name } }); setAddonIds(e.target.checked ? [...addonIds, a.id] : addonIds.filter((x) => x !== a.id)); }} />
                <span className="flex-1"><span className="block font-semibold">{a.name}</span><span className="text-sm text-ink/65">{a.description}</span></span>
                <span className="text-right text-sm font-bold">{money(a.price)}<span className="block text-xs font-normal text-ink/65">{a.unit === "PER_PERSON" ? "per person" : "per booking"}</span></span></label>); })}
              {!addons.length && <p className="rounded-2xl border border-ink/15 p-4 text-sm text-ink/65">No extras for this tour.</p>}</div>
            <div className="mt-8"><label className="label" htmlFor="coupon">Have a coupon code?</label>
              <div className="flex gap-2"><input id="coupon" className="input uppercase" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter code" /><button type="button" className="btn btn-outline" onClick={() => setAppliedCoupon(coupon.trim())}>Apply</button></div>
              {appliedCoupon && (couponMsg ? <p className="mt-2 text-sm text-red-700">{couponMsg}</p> : quote && quote.discount > 0 ? <p className="mt-2 text-sm font-medium text-[#1a7f45]">Coupon applied: you save {money(quote.discount)}</p> : null)}</div>
          </section>}

          {step === 3 && <section aria-labelledby="s3">
            <h2 id="s3" className="font-display text-2xl font-bold">Your details</h2>
            <p className="mt-1 text-ink/65">We'll send your confirmation and trip updates here.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {field("name", "Full name (lead traveler)", c.name, (v) => setC({ ...c, name: v }), { autoComplete: "name" })}
              {field("email", "Email", c.email, (v) => setC({ ...c, email: v }), { type: "email", autoComplete: "email", inputMode: "email" })}
              {field("wa", "WhatsApp number (with country code)", c.whatsapp, (v) => setC({ ...c, whatsapp: v }), { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "+44 7700 900123" })}
              <div><label className="label" htmlFor="nat">Nationality (as on your passport)</label><select id="nat" className="input" value={c.nationality} onChange={(e) => setC({ ...c, nationality: e.target.value })} autoComplete="country-name"><option value="">Select your nationality</option>{COUNTRIES.map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            </div>
            <h3 className="mt-8 font-display text-xl font-bold">Pickup</h3>
            <p className="text-sm text-ink/65">{tour.pickupInfo || "Tell us where to collect you."}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {field("hotel", "Hotel name (or 'not booked yet')", c.hotel, (v) => setC({ ...c, hotel: v }))}
              {field("pn", "Area, address or notes", c.pickupNotes, (v) => setC({ ...c, pickupNotes: v }))}
            </div>
            {people + infants > 1 && <div className="mt-8"><h3 className="font-display text-xl font-bold">Other travelers <span className="text-sm font-normal text-ink/65">(optional)</span></h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">{Array.from({ length: people + infants - 1 }).map((_, i) => <div key={i}><label className="label" htmlFor={`o${i}`}>Traveler {i + 2}</label><input id={`o${i}`} className="input" value={others[i] ?? ""} onChange={(e) => { const n = [...others]; n[i] = e.target.value; setOthers(n); }} placeholder="Full name" /></div>)}</div></div>}
            <h3 className="mt-8 font-display text-xl font-bold">Anything we should know?</h3>
            <div className="mt-3 grid gap-4">
              <div><label className="label" htmlFor="req">Special requests</label><textarea id="req" rows={3} className="input" value={c.requests} onChange={(e) => setC({ ...c, requests: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">{field("diet", "Dietary requirements", c.dietary, (v) => setC({ ...c, dietary: v }))}{field("acc", "Accessibility needs", c.accessibility, (v) => setC({ ...c, accessibility: v }))}</div>
            </div>
            <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-black" checked={consent} onChange={(e) => setConsent(e.target.checked)} />Send me a few helpful tips for my trip. Unsubscribe any time.</label>
          </section>}

          {step === 4 && <section aria-labelledby="s4">
            <h2 id="s4" className="font-display text-2xl font-bold">Review and confirm</h2>
            <div className="mt-4 divide-y divide-ink/10 rounded-2xl border border-ink/15 text-sm">
              {([["Trip", `${date ? prettyDate(date) : ""} · ${adults} adult${adults > 1 ? "s" : ""}${children ? `, ${children} child${children > 1 ? "ren" : ""}` : ""}${infants ? `, ${infants} infant${infants > 1 ? "s" : ""}` : ""} · ${isPrivate ? "Private" : "Shared"}`, 1], ["Extras", addonIds.length ? addons.filter((a) => addonIds.includes(a.id)).map((a) => a.name).join(", ") : "None", 2], ["Contact", `${c.name} · ${c.email} · ${c.whatsapp}`, 3], ["Pickup", c.hotel || "To be confirmed", 3]] as [string, string, number][]).map(([k, v, s]) => (
                <div key={k} className="flex items-start justify-between gap-4 p-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{k}</p><p className="mt-0.5 font-medium">{v}</p></div><button type="button" onClick={() => goTo(s)} className="text-sm font-semibold underline decoration-gold-500 decoration-2 underline-offset-4">Edit</button></div>))}
            </div>
            <h3 className="mt-8 font-display text-xl font-bold">How would you like to pay?</h3>
            <div className="mt-3 space-y-3" role="radiogroup" aria-label="Payment option">
              {([["DEPOSIT", `Pay ${DEPOSIT_PERCENT}% deposit now`, quote ? `${money(Math.round(quote.total * DEPOSIT_PERCENT) / 100)} now, the rest before your trip` : "", true], ["FULL", "Pay in full now", quote ? money(quote.total) : "", true], ["PAY_LATER", "Reserve now, pay later", payLaterOk ? "Pay nothing today. Available 7+ days before travel." : "Only available when your trip is 7+ days away", payLaterOk]] as [PayMode, string, string, boolean][]).map(([v, l, sub, ok]) => (
                <label key={v} className={`flex items-start gap-3 rounded-2xl border p-4 ${!ok ? "opacity-50" : "cursor-pointer"} ${payMode === v ? "border-ink bg-gold-500/15" : "border-ink/15 hover:border-ink"}`}><input type="radio" name="pay" disabled={!ok} className="mt-1 h-5 w-5 accent-black" checked={payMode === v} onChange={() => setPayMode(v)} /><span><span className="block font-semibold">{l}</span><span className="text-sm text-ink/65">{sub}</span></span></label>))}
            </div>
            <div className="mt-4 rounded-2xl bg-gold-500/15 p-4 text-sm"><p className="font-semibold">No card needed on this page.</p><p className="text-ink/75">After you confirm, our team checks availability and sends a secure payment link by WhatsApp and email.</p></div>
            <div className="mt-6"><p className="text-sm font-semibold">Cancellation policy</p><p className="text-sm text-ink/70">{tour.cancellationPolicy || "See the tour page for details."}</p></div>
            <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-black" checked={terms} onChange={(e) => setTerms(e.target.checked)} />I agree to the <a href="/terms" target="_blank" rel="noopener" className="font-semibold underline">booking terms</a> and cancellation policy above, and the <a href="/privacy-policy" target="_blank" rel="noopener" className="font-semibold underline">privacy policy</a>.</label>
          </section>}

          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}

        </div>
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-ink/10 bg-white p-3 lg:static lg:mt-8 lg:border-0 lg:p-0">
            {step > 1 && <button type="button" onClick={() => goTo(step - 1)} className="btn btn-outline">Back</button>}
            <div className="mr-auto leading-tight lg:hidden"><p className="text-xs text-ink/65">Total</p><p className="font-display text-lg font-extrabold">{quote ? money(quote.total) : "–"}</p></div>
            {step < 4 ? <button type="button" onClick={next} className="btn btn-primary flex-1 lg:min-w-[220px] lg:flex-none">{step === 3 ? "Review booking" : "Continue"}</button>
              : <button type="button" onClick={submit} disabled={busy} className="btn btn-primary flex-1 disabled:opacity-60 lg:min-w-[240px] lg:flex-none">{busy ? "Confirming…" : "Confirm booking"}</button>}
          </div>
        </div>
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start"><Summary /></aside>
      </div>
    </div>
  );
}
