"use client";
import { useRef, useState } from "react";
import { COUNTRIES, LANGUAGES, VISA_STATUS, OCCASIONS } from "@/lib/countries";
import { orderSaveTraveler, orderAddTraveler, orderDeleteTraveler, orderSaveOps } from "@/app/admin/order-actions";
import { waUrl, shortDate } from "./order-ui";
import type { Order, Traveler } from "@/lib/orders";
import { F, FieldCtx, fieldApi } from "./FormField";
import { buildGuideMessage } from "@/lib/guide-message";

type Res = { ok: boolean; message: string; order?: Order | null; warn?: boolean };
type Run = (fn: () => Promise<Res>) => Promise<Res | null>;
const Btn = "btn btn-outline !min-h-[38px] !py-1.5 !px-3 !text-[13px]";
const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
const monthsBetween = (fromISO: string, toISO: string) => (new Date(toISO).getTime() - new Date(fromISO).getTime()) / (30.4 * 86400000);

export function completeness(o: Order) {
  const pax = o.adults + o.children + o.infants;
  const withPassport = o.travelers.filter((t) => t.files.some((f) => f.kind === "PASSPORT")).length;
  const withNat = o.travelers.filter((t) => t.nationality).length;
  const childrenNoAge = o.travelers.filter((t) => t.type !== "ADULT" && (t.age === null || t.age === undefined)).length;
  const missing: { label: string; tab: "travelers" | "ops" }[] = [];
  if (withPassport < pax) missing.push({ label: `Passports ${withPassport}/${pax}`, tab: "travelers" });
  if (withNat < pax) missing.push({ label: `Nationality ${withNat}/${pax}`, tab: "travelers" });
  if (childrenNoAge) missing.push({ label: `${childrenNoAge} child age${childrenNoAge > 1 ? "s" : ""}`, tab: "travelers" });
  if (!o.ops.guideId) missing.push({ label: "No guide", tab: "ops" });
  if (!o.ops.preferredLanguage) missing.push({ label: "Language", tab: "ops" });
  if (!o.ops.flightArrival) missing.push({ label: "Arrival flight", tab: "ops" });
  return { pax, withPassport, missing };
}

function TravelerCard({ o, t, n, busy, run, refresh }: { o: Order; t: Traveler; n: number; busy: boolean; run: Run; refresh: () => Promise<void> }) {
  const [v, setV] = useState({ name: t.name, type: t.type, age: t.age === null ? "" : String(t.age), nationality: t.nationality, dob: t.dob, passportNumber: t.passportNumber, passportExpiry: t.passportExpiry, notes: t.notes });
  const [up, setUp] = useState<string | null>(null); const [err, setErr] = useState(""); const [show, setShow] = useState(false);
  const input = useRef<HTMLInputElement>(null); const kindRef = useRef("PASSPORT");
  const dirty = JSON.stringify(v) !== JSON.stringify({ name: t.name, type: t.type, age: t.age === null ? "" : String(t.age), nationality: t.nationality, dob: t.dob, passportNumber: t.passportNumber, passportExpiry: t.passportExpiry, notes: t.notes });
  const hasPassport = t.files.some((f) => f.kind === "PASSPORT");
  const expWarn = v.passportExpiry && monthsBetween(o.travelDate, v.passportExpiry) < 6 ? (monthsBetween(o.travelDate, v.passportExpiry) < 0 ? "Passport expires before the trip" : "Passport expires within 6 months of the trip") : "";
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function upload(file: File, kind: string) {
    setErr(""); if (file.size > 4_000_000) { setErr(`That file is ${(file.size / 1e6).toFixed(1)} MB. The limit is 4 MB.`); return; }
    if (dirty) await run(() => orderSaveTraveler(o.id, t.id, { ...v, age: v.age === "" ? "" : Number(v.age) })); // keep what was typed before the card refreshes
    setUp(kind);
    try { const fd = new FormData(); fd.set("file", file); fd.set("kind", kind); const r = await fetch(`/api/admin/travelers/${t.id}/files`, { method: "POST", body: fd }); const j = await r.json().catch(() => ({})); if (!r.ok || !j.ok) setErr(j.error ?? "Upload failed. Try again."); else await refresh(); }
    catch { setErr("Upload failed. Check your connection."); } finally { setUp(null); if (input.current) input.current.value = ""; }
  }
  async function del(id: string) { if (!confirm("Delete this file? This can't be undone.")) return; await fetch(`/api/admin/files/${id}`, { method: "DELETE" }); await refresh(); }
  const ctx = fieldApi(v, set, `t${t.id}`);
  return (
    <FieldCtx.Provider value={ctx}>
    <div className="rounded-2xl border border-ink/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-extrabold">{n}. {v.name || "Traveler"} <span className="ml-1 rounded-full bg-ink/[.07] px-2 py-0.5 align-middle text-xs font-bold">{v.type === "ADULT" ? "Adult" : v.type === "CHILD" ? "Child" : "Infant"}</span></p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${hasPassport ? "bg-[#DFF3E6] text-[#17663A]" : "bg-[#FDE9D3] text-[#8A4B0A]"}`}>{hasPassport ? "Passport uploaded" : "Passport missing"}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <F k="name" label="Full name (as on passport)" cls="lg:col-span-2" />
        <div><label className="label" htmlFor={`t${t.id}type`}>Type</label><select id={`t${t.id}type`} className="input !py-2" value={v.type} onChange={set("type")}><option value="ADULT">Adult</option><option value="CHILD">Child</option><option value="INFANT">Infant</option></select></div>
        <F k="age" label={v.type === "ADULT" ? "Age (optional)" : "Age (required)"} type="number" />
        <F k="nationality" label="Nationality" list="countries" /><F k="dob" label="Date of birth" type="date" />
        <div><label className="label" htmlFor={`t${t.id}pn`}>Passport number</label><div className="flex gap-1.5"><input id={`t${t.id}pn`} className="input !py-2" type={show ? "text" : "password"} autoComplete="off" value={v.passportNumber} onChange={set("passportNumber")} /><button type="button" className="rounded-xl border border-ink/20 px-2.5 text-xs font-bold" onClick={() => setShow(!show)} aria-label={show ? "Hide passport number" : "Show passport number"}>{show ? "Hide" : "Show"}</button></div></div>
        <F k="passportExpiry" label="Passport expiry" type="date" />
        <F k="notes" label="Notes (allergies, needs…)" cls="sm:col-span-2 lg:col-span-4" />
      </div>
      {expWarn && <p className="mt-2 rounded-lg bg-[#FFF3D6] px-3 py-2 text-sm font-semibold text-[#7A4B00]">⚠ {expWarn}. Many airlines and border checks require 6 months of validity.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || !dirty} className="btn btn-dark !min-h-[40px] !py-2 !text-[14px] disabled:opacity-40" onClick={() => run(() => orderSaveTraveler(o.id, t.id, { ...v, age: v.age === "" ? "" : Number(v.age) }))}>{dirty ? "Save traveler" : "Saved"}</button>
        <button type="button" disabled={!!up} className="btn btn-primary !min-h-[40px] !py-2 !text-[14px]" onClick={() => { kindRef.current = "PASSPORT"; input.current?.click(); }}>{up === "PASSPORT" ? "Uploading…" : hasPassport ? "+ Another passport page" : "Upload passport"}</button>
        <button type="button" disabled={!!up} className={Btn} onClick={() => { kindRef.current = "VISA"; input.current?.click(); }}>{up === "VISA" ? "Uploading…" : "Upload visa"}</button>
        <input ref={input} type="file" className="sr-only" aria-label={`Upload file for ${v.name}`} accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, kindRef.current); }} />
        {t.type !== "ADULT" || o.adults + o.children + o.infants > 1 ? <button type="button" className="ml-auto text-sm font-semibold text-red-700 underline" onClick={() => { if (confirm(`Remove ${v.name || "this traveler"} and their files from this order?`)) void run(() => orderDeleteTraveler(o.id, t.id)); }}>Remove</button> : null}
      </div>
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{err}</p>}
      {t.files.length > 0 && <ul className="mt-3 divide-y divide-ink/10 rounded-xl bg-ink/[.04] text-sm">{t.files.map((f) => (
        <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span className="min-w-0 truncate"><b>{f.kind === "PASSPORT" ? "Passport" : f.kind === "VISA" ? "Visa" : "File"}</b> <span className="text-ink/65">· {f.filename} · {kb(f.size)}</span></span>
          <span className="flex gap-2"><a className={Btn} href={`/api/admin/files/${f.id}`} target="_blank" rel="noopener noreferrer">View</a><a className={Btn} href={`/api/admin/files/${f.id}?download=1`}>Download</a><button type="button" className={`${Btn} text-red-700`} onClick={() => void del(f.id)}>Delete</button></span></li>))}</ul>}
    </div>
    </FieldCtx.Provider>
  );
}

export function TravelersPanel({ o, busy, run, refresh }: { o: Order; busy: boolean; run: Run; refresh: () => Promise<void> }) {
  const c = completeness(o);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gold-500/15 p-4">
        <p className="font-display font-extrabold">{o.adults} adult{o.adults > 1 ? "s" : ""}{o.children ? `, ${o.children} child${o.children > 1 ? "ren" : ""}` : ", no children"}{o.infants ? `, ${o.infants} infant${o.infants > 1 ? "s" : ""}` : ""} · Passports {c.withPassport} of {c.pax}</p>
        <datalist id="countries">{COUNTRIES.map((x) => <option key={x} value={x} />)}</datalist>
        <p className="mt-1 text-sm text-ink/65">Upload a clear photo or PDF of each passport photo page (JPG, PNG, WebP or PDF, up to 4 MB). Files are encrypted, visible only to logged-in staff, and every view is logged. Delete them after the trip.</p>
      </div>
      {o.travelers.map((t, i) => <TravelerCard key={t.id + JSON.stringify(t)} o={o} t={t} n={i + 1} busy={busy} run={run} refresh={refresh} />)}
      <div className="flex flex-wrap gap-2"><button type="button" className={Btn} disabled={busy} onClick={() => run(() => orderAddTraveler(o.id, "ADULT"))}>+ Adult</button><button type="button" className={Btn} disabled={busy} onClick={() => run(() => orderAddTraveler(o.id, "CHILD"))}>+ Child</button><button type="button" className={Btn} disabled={busy} onClick={() => run(() => orderAddTraveler(o.id, "INFANT"))}>+ Infant</button></div>
    </div>
  );
}

export function OpsPanel({ o, busy, run }: { o: Order; busy: boolean; run: Run }) {
  const init = { ...o.ops, dietary: o.dietary, accessibility: o.accessibility, hotel: o.hotel, requests: o.requests };
  const [v, setV] = useState(init); const dirty = JSON.stringify(v) !== JSON.stringify(init);
  const guide = o.guides.find((g) => g.id === v.guideId); const langMismatch = guide && v.preferredLanguage && guide.languages && !guide.languages.toLowerCase().includes(v.preferredLanguage.toLowerCase());
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const ctx = fieldApi(v, set, "o");
  const kids = o.travelers.filter((t) => t.type !== "ADULT");
  const savedGuide = o.guides.find((g) => g.id === o.ops.guideId); const guideMsg = savedGuide ? buildGuideMessage(o, savedGuide, o.guideUrl) : ""; const [copied, setCopied] = useState(false);
  return (
    <FieldCtx.Provider value={ctx}>
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(() => orderSaveOps(o.id, v)); }}>
      <datalist id="langs">{LANGUAGES.map((x) => <option key={x} value={x} />)}</datalist><datalist id="occ">{OCCASIONS.map((x) => <option key={x} value={x} />)}</datalist>
      <section className="rounded-2xl border border-ink/10 p-4"><h2 className="mb-3 font-display text-base font-extrabold">Guide and language</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div><label className="label" htmlFor="oguide">Assigned tour guide</label><select id="oguide" className="input !py-2" value={v.guideId} onChange={set("guideId")}><option value="">Not assigned yet</option>{o.guides.map((g) => <option key={g.id} value={g.id}>{g.name}{g.languages ? ` (${g.languages})` : ""}{!g.active ? " (inactive)" : ""}</option>)}</select>{!o.guides.length && <p className="mt-1 text-xs text-ink/65">No guides yet. Add them in Settings → Guides.</p>}</div>
          <F k="preferredLanguage" label="Customer's preferred language" list="langs" />
          <F k="driver" label="Driver" /><F k="vehicle" label="Vehicle" ph="Car / van / plate" />
        </div>
        {langMismatch && <p className="mt-2 rounded-lg bg-[#FFF3D6] px-3 py-2 text-sm font-semibold text-[#7A4B00]">⚠ {guide!.name} doesn't list {v.preferredLanguage}. Check the language or pick another guide.</p>}
        {savedGuide && <div className="mt-3 rounded-xl bg-ink/[.04] p-3"><p className="text-sm font-semibold">Full trip sheet for {savedGuide.name.split(" ")[0]}</p><p className="mt-0.5 text-xs text-ink/65">A private link with everything: guests, contacts, plan of the day, special care and payment status. It updates when you change the order, and expires a few days after the trip. Passport details are never shown.{dirty ? " Save your changes first so the guide sees them." : ""}</p>
          <div className="mt-2 flex flex-wrap gap-2">{savedGuide.phone && <a className="btn btn-wa !min-h-[40px] !py-2 !text-[14px]" target="_blank" rel="noopener noreferrer" href={waUrl(savedGuide.phone, guideMsg)}>Send all details to {savedGuide.name.split(" ")[0]} on WhatsApp</a>}<a className={Btn} target="_blank" rel="noopener noreferrer" href={o.guideUrl}>Open guide sheet</a><button type="button" className={Btn} onClick={() => { void navigator.clipboard?.writeText(o.guideUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}>{copied ? "Link copied" : "Copy link"}</button></div></div>}
      </section>
      <section className="rounded-2xl border border-ink/10 p-4"><h2 className="mb-3 font-display text-base font-extrabold">Arrival and pickup</h2>
        <div className="grid gap-2 sm:grid-cols-2"><F k="flightArrival" label="Arrival flight" ph="MS 777, 30 Oct 14:20" /><F k="flightDeparture" label="Departure flight" ph="MS 778, 2 Nov 09:10" />
          <F k="hotel" label="Hotel / pickup place" /><F k="pickupTime" label="Pickup time" ph="08:00" /><F k="roomType" label="Room type" ph="Double, twin, family" /><F k="occasion" label="Occasion" list="occ" /></div></section>
      <section className="rounded-2xl border border-ink/10 p-4"><h2 className="mb-3 font-display text-base font-extrabold">Care and paperwork</h2>
        <div className="grid gap-2 sm:grid-cols-2"><div><label className="label" htmlFor="ovisa">Visa status</label><select id="ovisa" className="input !py-2" value={v.visaStatus} onChange={set("visaStatus")}><option value="">Not set</option>{VISA_STATUS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <F k="emergencyContact" label="Emergency contact (name and phone)" /><F k="dietary" label="Dietary requirements" /><F k="accessibility" label="Accessibility needs" />
          <div className="sm:col-span-2"><label className="label" htmlFor="ogn">Notes for the guide (private instructions only the guide sees, for example: collect the balance in cash, VIP guest, pickup gate)</label><textarea id="ogn" className="input !py-2" rows={3} value={v.guideNotes} onChange={set("guideNotes")} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="oreq">Special requests</label><textarea id="oreq" className="input !py-2" rows={3} value={v.requests} onChange={set("requests")} /></div></div></section>
      <div className="flex items-center gap-3"><button disabled={busy || !dirty} className="btn btn-primary !min-h-[46px] disabled:opacity-50">{dirty ? "Save operations details" : "Saved"}</button></div>
    </form>
    </FieldCtx.Provider>
  );
}
