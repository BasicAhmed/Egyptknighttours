"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { saveItinerary, generateItineraryPdf, duplicateItinerary, saveAsTemplate, deleteItinerary, attachItinerary } from "@/app/admin/doc-actions";
import { blk, day as newDay, suggestHook, uid } from "@/lib/itinerary-templates";
import ImageField from "./ImageField";
import type { Block, BlockType, Day, ItineraryContent } from "@/pdf/types";

const TYPES: [BlockType, string][] = [["ACTIVITY", "Activity"], ["TOUR", "Tour"], ["TRANSFER", "Airport transfer"], ["TRANSPORT", "Transportation"], ["FLIGHT", "Flight"], ["HOTEL", "Hotel"], ["MEAL", "Restaurant / meal"], ["FREE_TIME", "Free time"], ["MEETING_POINT", "Meeting point"], ["GUIDE", "Guide information"], ["INFO", "Important information"], ["NOTE", "Notes"]];
type Init = { name: string; description: string; bookingId: string | null; costPrice: number | null; marginPercent: number | null; content: ItineraryContent };
type BookingOpt = { id: string; label: string; travelers: number; currency?: string };
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
const swap = <T,>(a: T[], i: number, j: number) => { if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; };
const In = ({ label, value, onChange, ph, type = "text", cls = "" }: { label: string; value: string; onChange: (v: string) => void; ph?: string; type?: string; cls?: string }) => (
  <label className={`block ${cls}`}><span className="label">{label}</span><input type={type} className="input !py-2 text-[15px]" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} /></label>);
const Ta = ({ label, value, onChange, rows = 3, cls = "" }: { label: string; value: string; onChange: (v: string) => void; rows?: number; cls?: string }) => (
  <label className={`block ${cls}`}><span className="label">{label}</span><textarea rows={rows} className="input !py-2 text-[15px]" value={value} onChange={(e) => onChange(e.target.value)} /></label>);
const Mini = ({ onClick, children, danger = false, disabled = false }: { onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) => <button type="button" onClick={onClick} disabled={disabled} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-30 ${danger ? "border-red-200 text-red-700 hover:bg-red-50" : "border-ink/20 hover:border-ink"}`}>{children}</button>;

// A collapsible panel used inside every tab, so a long tab can be tucked away without leaving the tab itself.
function Panel({ id, title, right, openState, setOpenState, children }: { id: string; title: string; right?: React.ReactNode; openState: Record<string, boolean>; setOpenState: (o: Record<string, boolean>) => void; children: React.ReactNode }) {
  const open = openState[id] ?? !["closing", "attach", "manage"].includes(id);
  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="flex items-center gap-2 text-left font-display text-xl font-bold" aria-expanded={open} onClick={() => setOpenState({ ...openState, [id]: !open })}><span>{open ? "−" : "+"}</span>{title}</button>
        {right}
      </div>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

export default function ItineraryEditor({ id, isTemplate, status, initial, bookings, docs, currency = "USD" }: { id: string; isTemplate: boolean; status: string; initial: Init; bookings: BookingOpt[]; docs: { id: string; number: string; sent: string | null; created: string }[]; currency?: string }) {
  const [name, setName] = useState(initial.name); const [desc, setDesc] = useState(initial.description);
  const [bookingId, setBookingId] = useState(initial.bookingId ?? "");
  const [cost, setCost] = useState(initial.costPrice != null ? String(initial.costPrice) : ""); const [margin, setMargin] = useState(initial.marginPercent != null ? String(initial.marginPercent) : "");
  const [curr, setCurr] = useState(currency); // starts as the linked order's currency (or USD); changing it on a linked order changes that order's currency too
  const priced = cost !== "" && margin !== "" && Number(cost) >= 0 && Number(margin) >= 0;
  const unitCalc = priced ? Math.round(Number(cost) * (1 + Number(margin) / 100) * 100) / 100 : null;
  const travelers = bookings.find((b) => b.id === bookingId)?.travelers ?? 1;
  const totalCalc = unitCalc != null ? Math.round(unitCalc * travelers * 100) / 100 : null;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: curr, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  const [c, setC] = useState<ItineraryContent>(initial.content);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [tab, setTab] = useState<"content" | "days" | "price" | "booking">("content");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dayOpen, setDayOpen] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();
  // What is on screen vs. what was last saved, so the bar can say "Unsaved changes" and warn before the page is left.
  const snap = JSON.stringify([name, desc, bookingId, cost, margin, curr, c]);
  const [savedSnap, setSavedSnap] = useState(snap); const dirty = snap !== savedSnap;
  useEffect(() => { if (!dirty) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);
  const upd = (fn: (n: ItineraryContent) => void) => setC((p) => { const n = structuredClone(p); fn(n); return n; });
  const updDay = (i: number, fn: (d: Day) => void) => upd((n) => fn(n.days[i]));

  async function save(force = false): Promise<boolean> {
    const r = await saveItinerary(id, JSON.stringify({ name, description: desc, bookingId: bookingId || null, content: c, costPrice: cost === "" ? null : Number(cost), marginPercent: margin === "" ? null : Number(margin), currency: curr, force }));
    if (!r.ok && r.needsConfirm) { if (window.confirm(r.message)) return save(true); setMsg({ t: "Not saved — the order was left as it was.", err: true }); return false; }
    setMsg({ t: r.message, err: !r.ok }); if (r.ok) setSavedSnap(snap); return r.ok;
  }
  const run = (fn: () => Promise<unknown>) => start(async () => { if (await save()) await fn(); });
  const generate = (send: boolean) => run(async () => { const fd = new FormData(); if (send) fd.set("sendNow", "on"); await generateItineraryPdf(id, fd); });
  const preview = () => {
    // Open the tab right away inside the click. Browsers (iPhone Safari especially) block tabs opened after a delay.
    const w = window.open("", "_blank");
    try { w?.document.write("<p style='font-family:sans-serif;padding:24px'>Preparing your PDF…</p>"); } catch {}
    start(async () => {
      const ok = await save(); const url = `/api/admin/preview/itinerary/${id}`;
      if (!ok) { w?.close(); return; }
      if (w) w.location.href = url; else window.location.href = url;
    });
  };

  const linked = bookings.find((b) => b.id === bookingId);
  const sent = docs.some((d) => d.sent);
  // The four steps are also the tabs: fill in the trip, plan the days, set the price, send it.
  const STEPS: { k: typeof tab; label: string; done: boolean }[] = [
    { k: "content", label: "Trip details", done: !!c.title && (isTemplate || !!c.startDate) },
    { k: "days", label: `Days (${c.days.length})`, done: c.days.some((d) => d.title) },
    { k: "price", label: "Price", done: priced },
    { k: "booking", label: isTemplate ? "Manage" : "Send", done: !isTemplate && sent },
  ];
  const at = STEPS.findIndex((x) => x.k === tab); const nextTab = STEPS[at + 1];
  const go = (k: typeof tab) => { setTab(k); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="space-y-4 pb-36 md:pb-24">
      <h1 className="sr-only">{isTemplate ? "Edit template" : "Edit itinerary"}: {name || "Untitled"}</h1>
      <div className="rounded-2xl bg-ink p-4 text-white">
        <div className="flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Itinerary name" className="min-w-0 flex-1 rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 font-display text-[17px] font-extrabold text-white outline-none placeholder:text-white/40 focus:border-gold-500" placeholder="Itinerary name" />
          <span className="shrink-0 rounded-md bg-white/15 px-2 py-1 text-[11.5px] font-bold">{isTemplate ? "Template" : status === "DRAFT" ? "Draft" : status.charAt(0) + status.slice(1).toLowerCase()}</span>
        </div>
        <p className="mt-2.5 text-[13.5px] text-white/65">{linked ? <>For order <Link href={`/admin?open=${linked.id}`} className="font-semibold text-white underline decoration-gold-500 decoration-2 underline-offset-4">{linked.label.split(" · ").slice(0, 2).join(", ")}</Link></> : isTemplate ? "A reusable plan. Start new itineraries from it." : "Not linked to an order."}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/[.08] px-2 py-2.5"><p className="font-display text-[19px] font-extrabold leading-none">{c.durationDays ?? c.days.length}</p><p className="mt-1 text-[11.5px] text-white/60">days</p></div>
          <div className="rounded-xl bg-white/[.08] px-2 py-2.5"><p className="font-display text-[19px] font-extrabold leading-none">{unitCalc != null ? fmt(unitCalc) : "–"}</p><p className="mt-1 text-[11.5px] text-white/60">per person</p></div>
          <div className="rounded-xl bg-white/[.08] px-2 py-2.5"><p className="font-display text-[19px] font-extrabold leading-none text-gold-500">{linked && totalCalc != null ? fmt(totalCalc) : "–"}</p><p className="mt-1 text-[11.5px] text-white/60">{linked ? `total, ${travelers} traveler${travelers === 1 ? "" : "s"}` : "order total"}</p></div>
        </div>
      </div>

      <div role="tablist" aria-label="Itinerary steps" className="sticky top-14 z-20 -mx-4 flex bg-[#EFEDE7]/95 px-4 py-2.5 backdrop-blur md:top-0 md:-mx-9 md:px-9">
        {STEPS.map((x, i) => <button key={x.k} role="tab" aria-selected={tab === x.k} onClick={() => go(x.k)} className="relative flex flex-1 flex-col items-center text-center">
          {i > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-[13px] h-0.5 w-full ${STEPS[i - 1].done ? "bg-[#1F8A4C]" : "bg-ink/10"}`} />}
          <span className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-bold ${tab === x.k ? "bg-ink text-white ring-4 ring-ink/15" : x.done ? "bg-[#1F8A4C] text-white" : "bg-white text-ink/55"}`}>{x.done && tab !== x.k ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : i + 1}</span>
          <span className={`mt-1.5 text-[12px] font-semibold leading-tight ${tab === x.k ? "text-ink" : "text-ink/55"}`}>{x.label}<span className="sr-only">{x.done ? ", done" : ""}</span></span>
        </button>)}
      </div>

      {/* Always within reach: what state the work is in, save, preview, and the next step. */}
      <div className="fixed inset-x-0 bottom-[calc(3.7rem+env(safe-area-inset-bottom))] z-20 border-t border-ink/10 bg-white px-4 py-2.5 shadow-[0_-8px_24px_-16px_rgba(20,16,16,.3)] md:bottom-0 md:left-[248px] md:px-9">
        <div className="mx-auto flex max-w-[1108px] items-center gap-2">
          <p role="status" className={`line-clamp-2 min-w-0 flex-1 text-[12.5px] font-semibold leading-tight ${pending ? "text-ink/60" : msg?.err ? "text-red-700" : dirty ? "text-[#8A4B0A]" : "text-[#17663A]"}`}>{pending ? "Working…" : msg?.err ? msg.t : dirty ? "Unsaved changes" : msg?.t ?? "Saved"}</p>
          <button type="button" className="btn btn-outline !min-h-[40px] !px-3 !py-2 !text-[13.5px]" disabled={pending} onClick={preview}>Preview</button>
          <button type="button" className={`btn !min-h-[40px] !px-4 !py-2 !text-[13.5px] ${dirty ? "btn-primary" : "btn-outline"}`} disabled={pending} onClick={() => start(async () => { await save(); })}>Save</button>
          {nextTab && <button type="button" className="btn btn-dark !min-h-[40px] !px-3 !py-2 !text-[13.5px]" onClick={() => go(nextTab.k)}>Next: {nextTab.label.replace(/ \(\d+\)/, "")}</button>}
        </div>
        {msg?.err && <p className="mx-auto mt-1 max-w-[1108px] text-[12.5px] text-red-700 md:hidden">{msg.t}</p>}
      </div>

      <div hidden={tab !== "content"} className="space-y-5">
        <Panel id="content" title="Cover and overview" openState={open} setOpenState={setOpen}>
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Trip title (cover)" value={c.title} onChange={(v) => upd((n) => { n.title = v; })} ph="Cairo & the Nile" />
            <In label="Subtitle" value={c.subtitle} onChange={(v) => upd((n) => { n.subtitle = v; })} ph="8 days, 7 nights" />
            <In label="Days (shown on the PDF)" type="number" value={c.durationDays == null ? "" : String(c.durationDays)} onChange={(v) => upd((n) => { n.durationDays = v === "" ? null : Math.max(0, parseInt(v, 10) || 0); })} ph={`Auto — ${c.days.length} (from day blocks)`} />
            <In label="Nights (shown on the PDF)" type="number" value={c.durationNights == null ? "" : String(c.durationNights)} onChange={(v) => upd((n) => { n.durationNights = v === "" ? null : Math.max(0, parseInt(v, 10) || 0); })} ph={`Auto — ${Math.max(0, c.days.length - 1)}`} />
            <p className="sm:col-span-2 -mt-1 text-xs text-ink/55">Leave blank to use the number of day blocks below (days = day blocks, nights = days − 1). Set these when the trip's real length doesn't match the number of day blocks — for example a short, highlights-only itinerary for a longer trip.</p>
            <Ta cls="sm:col-span-2" label="Introduction (a short, exciting overview)" value={c.intro} onChange={(v) => upd((n) => { n.intro = v; })} rows={3} />
            <ImageField label="Cover photo" value={c.coverImageUrl} onChange={(v) => upd((n) => { n.coverImageUrl = v; })} hint="Upload a photo for the PDF cover." />
            <div><label className="label" htmlFor="ip-scene">Cover illustration (when no photo)</label><select id="ip-scene" className="input !py-2" value={c.sceneKind || "auto"} onChange={(e) => upd((n) => { n.sceneKind = e.target.value; })}>{["auto", "giza", "cairo", "luxor", "aswan", "alexandria", "hurghada"].map((k) => <option key={k}>{k}</option>)}</select></div>
            <In label="Prepared for (customer name)" value={c.customerName} onChange={(v) => upd((n) => { n.customerName = v; })} />
            <In label="Travelers" value={c.travelers} onChange={(v) => upd((n) => { n.travelers = v; })} ph="2 travelers" />
            <In label="Start date" type="date" value={c.startDate} onChange={(v) => upd((n) => { n.startDate = v; })} />
            <In label="End date" type="date" value={c.endDate} onChange={(v) => upd((n) => { n.endDate = v; })} />
            <In cls="sm:col-span-2" label="Route (comma separated cities)" value={c.destinations.join(", ")} onChange={(v) => upd((n) => { n.destinations = v.split(",").map((x) => x.trim()).filter(Boolean); })} ph="Cairo, Luxor, Aswan" />
          </div>
        </Panel>
        <Panel id="lists" title="Highlights and inclusions" openState={open} setOpenState={setOpen}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="ip-hl">Highlights (one per line)</label><textarea id="ip-hl" key="hl" rows={4} className="input !py-2" defaultValue={c.highlights.join("\n")} onBlur={(e) => upd((n) => { n.highlights = lines(e.target.value); })} /></div>
            <div><label className="label" htmlFor="ip-inc">Included (one per line)</label><textarea id="ip-inc" key="inc" rows={6} className="input !py-2" defaultValue={c.included.join("\n")} onBlur={(e) => upd((n) => { n.included = lines(e.target.value); })} /></div>
            <div><label className="label" htmlFor="ip-exc">Not included (one per line)</label><textarea id="ip-exc" key="exc" rows={6} className="input !py-2" defaultValue={c.excluded.join("\n")} onBlur={(e) => upd((n) => { n.excluded = lines(e.target.value); })} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="ip-imp">Important information (one per line)</label><textarea id="ip-imp" key="imp" rows={3} className="input !py-2" defaultValue={c.important.join("\n")} onBlur={(e) => upd((n) => { n.important = lines(e.target.value); })} /></div>
          </div>
        </Panel>
      </div>

      <div hidden={tab !== "days"} className="space-y-5">
        {!c.days.length && <p className="rounded-2xl border border-dashed border-ink/20 px-5 py-8 text-center text-sm text-ink/60">No days yet. Add the first day and build its timeline.</p>}
        {c.days.map((d, i) => (
          <section key={d.id} className="card p-4">
            <button type="button" aria-expanded={dayOpen[d.id] ?? i < 1} onClick={() => setDayOpen({ ...dayOpen, [d.id]: !(dayOpen[d.id] ?? i < 1) })} className="flex w-full items-center gap-3 text-left">
              <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F7F5F0] leading-none"><span className="text-[10px] font-semibold text-ink/55">Day</span><b className="font-display text-[17px] font-extrabold">{i + 1}</b></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-display text-[16px] font-extrabold">{d.title || "Untitled day"}</span><span className="block truncate text-[13px] text-ink/55">{[d.location, `${d.blocks.length} timeline item${d.blocks.length === 1 ? "" : "s"}`, d.hotel.name].filter(Boolean).join(", ")}</span></span>
              <span aria-hidden="true" className={`text-xl leading-none text-ink/45 transition-transform ${(dayOpen[d.id] ?? i < 1) ? "rotate-45" : ""}`}>+</span>
            </button>
            {(dayOpen[d.id] ?? i < 1) && <div className="mt-3 flex flex-wrap gap-1.5"><Mini disabled={i === 0} onClick={() => upd((n) => swap(n.days, i, i - 1))}>Move up</Mini><Mini disabled={i === c.days.length - 1} onClick={() => upd((n) => swap(n.days, i, i + 1))}>Move down</Mini>
                <Mini onClick={() => upd((n) => { const cp = structuredClone(n.days[i]); cp.id = uid(); cp.blocks.forEach((b) => { b.id = uid(); }); n.days.splice(i + 1, 0, cp); })}>Duplicate</Mini><Mini danger onClick={() => { if (confirm(`Delete Day ${i + 1}?`)) upd((n) => { n.days.splice(i, 1); }); }}>Delete</Mini></div>}
            {(dayOpen[d.id] ?? i < 1) && <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><div className="flex items-end gap-2"><div className="flex-1"><In label="Headline (what the traveler will feel)" value={d.title} onChange={(v) => updDay(i, (x) => { x.title = v; })} ph="Stand Before the Great Pyramids" /></div><Mini onClick={() => { const sgt = suggestHook(`${d.location} ${d.title}`, i + 1); updDay(i, (x) => { x.title = sgt.title; x.hook = sgt.hook; }); }}>Suggest</Mini></div></div>
                <Ta cls="sm:col-span-2" label="Short hook (one or two sentences)" value={d.hook} onChange={(v) => updDay(i, (x) => { x.hook = v; })} rows={2} />
                <In label="Location" value={d.location} onChange={(v) => updDay(i, (x) => { x.location = v; })} ph="Cairo · Giza" />
                <In label="Date" type="date" value={d.date} onChange={(v) => updDay(i, (x) => { x.date = v; })} />
                <div className="sm:col-span-2"><ImageField label="Day photo (leave empty for an illustration)" value={d.imageUrl} onChange={(v) => updDay(i, (x) => { x.imageUrl = v; })} compact /></div>
              </div>
              <div className="rounded-xl bg-sand-100 p-3"><p className="mb-2 text-sm font-semibold">Hotel for tonight</p><div className="grid gap-3 sm:grid-cols-2"><In label="Hotel name" value={d.hotel.name} onChange={(v) => updDay(i, (x) => { x.hotel.name = v; })} /><In label="Stars" value={d.hotel.stars} onChange={(v) => updDay(i, (x) => { x.hotel.stars = v; })} ph="4 stars" /><In label="Room / meal notes" value={d.hotel.notes} onChange={(v) => updDay(i, (x) => { x.hotel.notes = v; })} /><In label="Hotel link" value={d.hotel.link} onChange={(v) => updDay(i, (x) => { x.hotel.link = v; })} ph="https://" /></div></div>
              <div><p className="mb-2 text-sm font-semibold">Timeline</p>
                <div className="space-y-3">{d.blocks.map((b, j) => (
                  <div key={b.id} className="rounded-xl border border-ink/15 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><label className="sr-only" htmlFor={`bt-${b.id}`}>Item type</label><select id={`bt-${b.id}`} className="input !w-48 !py-1.5 text-sm" value={b.type} onChange={(e) => updDay(i, (x) => { x.blocks[j].type = e.target.value as BlockType; })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                      <div className="flex gap-1.5"><Mini disabled={j === 0} onClick={() => updDay(i, (x) => swap(x.blocks, j, j - 1))}>↑</Mini><Mini disabled={j === d.blocks.length - 1} onClick={() => updDay(i, (x) => swap(x.blocks, j, j + 1))}>↓</Mini><Mini danger onClick={() => updDay(i, (x) => { x.blocks.splice(j, 1); })}>Remove</Mini></div></div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[110px_1fr_1fr]"><In label="Time" value={b.time} onChange={(v) => updDay(i, (x) => { x.blocks[j].time = v; })} ph="Morning" /><In label="Title" value={b.title} onChange={(v) => updDay(i, (x) => { x.blocks[j].title = v; })} /><In label="Location" value={b.location} onChange={(v) => updDay(i, (x) => { x.blocks[j].location = v; })} /></div>
                    <Ta cls="mt-2" label="Description" value={b.description} onChange={(v) => updDay(i, (x) => { x.blocks[j].description = v; })} rows={2} />
                    <div className="mt-2 grid gap-2 sm:grid-cols-3"><In label="Link" value={b.link} onChange={(v) => updDay(i, (x) => { x.blocks[j].link = v; })} ph="https://" /><ImageField label="Photo" value={b.imageUrl} onChange={(v) => updDay(i, (x) => { x.blocks[j].imageUrl = v; })} compact /><In label="Note (highlighted)" value={b.notes} onChange={(v) => updDay(i, (x) => { x.blocks[j].notes = v; })} /></div>
                  </div>))}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">{TYPES.map(([v, l]) => <Mini key={v} onClick={() => updDay(i, (x) => { x.blocks.push(blk(v as BlockType, "", "", "") as Block); })}>+ {l}</Mini>)}</div>
              </div>
              <Ta label="Notes for this day (optional)" value={d.notes} onChange={(v) => updDay(i, (x) => { x.notes = v; })} rows={2} />
            </div>}
          </section>))}
        <button type="button" onClick={() => upd((n) => { const d = newDay("", "", "", []); n.days.push(d); setDayOpen((o) => ({ ...o, [d.id]: true })); })} className="w-full rounded-2xl border-2 border-dashed border-ink/20 py-4 text-[15px] font-semibold text-ink/70 hover:border-ink/50 hover:text-ink">+ Add day {c.days.length + 1}</button>
      </div>

      <div hidden={tab !== "price"} className="space-y-5">
        <Panel id="price" title="Price settings" openState={open} setOpenState={setOpen}>
          <p className="text-sm text-ink/65">Cost and price are always <b>per person</b>. Adding or removing a traveler on the linked order multiplies the total automatically — nothing to recalculate by hand.</p>
          <div className="mt-3"><label className="label" htmlFor="ip-curr">Currency</label><select id="ip-curr" className="input !w-auto !py-2" value={curr} onChange={(e) => setCurr(e.target.value)}>{Array.from(new Set(["USD", "EUR", "GBP", "EGP", "AED", "SAR", "QAR", "KWD", "CAD", "AUD", "CHF", "ZAR", curr])).map((c2) => <option key={c2}>{c2}</option>)}</select>{bookingId && <p className="mt-1 text-xs text-ink/65">Saving also sets the linked order's currency to {curr}. Prices are not converted — enter the cost in {curr}.</p>}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="ip-cost">Cost per person ({curr}, no profit)</label><input id="ip-cost" type="number" min={0} step="any" className="input !py-2" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="hotel, guide, driver, entrance fees" /></div>
            <div><label className="label" htmlFor="ip-margin">Profit margin (% added on top of cost)</label><input id="ip-margin" type="number" min={0} step="any" className="input !py-2" value={margin} onChange={(e) => setMargin(e.target.value)} /></div>
            <div><span className="label">Price per person</span><p className="input flex items-center !py-2 font-semibold">{unitCalc != null ? fmt(unitCalc) : "—"}</p></div>
          </div>
          {bookingId ? (
            <div className="mt-4 rounded-2xl bg-ink p-4 text-white">
              <div className="flex items-end justify-between gap-3"><div><p className="text-[13px] text-white/60">Order total</p><p className="font-display text-[30px] font-extrabold leading-none text-gold-500">{totalCalc != null ? fmt(totalCalc) : "–"}</p></div><p className="text-right text-[13.5px] text-white/70">{unitCalc != null ? fmt(unitCalc) : "–"} × {travelers} traveler{travelers === 1 ? "" : "s"}</p></div>
              {priced && <p className="mt-3 border-t border-white/10 pt-3 text-[13.5px] text-white/70">Your profit: <b className="text-white">{fmt(Math.round((unitCalc! - Number(cost)) * travelers * 100) / 100)}</b> ({fmt(Math.round((unitCalc! - Number(cost)) * 100) / 100)} per person)</p>}
              <p className="mt-2 text-[12.5px] text-white/50">Saving sets this as the order's total.</p>
            </div>
          ) : <p className="mt-3 text-xs text-ink/65">Fills in the price line on the PDF. Link this itinerary to an order in the Booking tab to also set its total automatically.</p>}
        </Panel>
      </div>

      <div hidden={tab !== "booking"} className="space-y-5">
        {!isTemplate && <section className="card p-4">
          <h2 className="font-display text-xl font-bold">Send to the customer</h2>
          {bookingId && !priced && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-500/15 p-3"><p className="text-[14px] text-ink/80">This order has no price yet. Set the cost and profit margin first.</p><button type="button" className="btn btn-dark !min-h-[40px] !py-2" onClick={() => go("price")}>Set the price</button></div>}
          <p className="mt-2 text-sm text-ink/65">Each PDF you create is saved with its own number{bookingId ? " on the order" : ""}, so you can always see what was sent.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button type="button" className="btn btn-outline" disabled={pending} onClick={preview}>Preview PDF</button>
            <button type="button" className="btn btn-dark" disabled={pending} onClick={() => generate(false)}>Create PDF</button>
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => generate(true)}>Create and email</button>
          </div>
          {docs.length > 0 && <ul className="mt-4 divide-y divide-ink/10 border-t border-ink/10 text-sm">{docs.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2.5"><span className="min-w-0"><b className="block truncate">{x.number}</b><span className="text-[13px] text-ink/55">Created {x.created}{x.sent ? `, sent ${x.sent}` : ", not sent"}</span></span><a className="shrink-0 font-semibold underline decoration-gold-500 decoration-2 underline-offset-4" href={`/api/documents/${x.id}/pdf`}>Download</a></li>)}</ul>}
          {linked && <Link href={`/admin?open=${linked.id}`} className="mt-3 inline-block text-sm font-semibold underline decoration-gold-500 decoration-2 underline-offset-4">Back to the order</Link>}
        </section>}
        <Panel id="closing" title="Closing page of the PDF" openState={open} setOpenState={setOpen}>
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Button text" value={c.ctaLabel} onChange={(v) => upd((n) => { n.ctaLabel = v; })} ph="Complete your booking" />
            <Ta cls="sm:col-span-2" label="Payment terms" value={c.paymentTerms} onChange={(v) => upd((n) => { n.paymentTerms = v; })} rows={2} />
            <In cls="sm:col-span-2" label="Button link (payment link). Leave blank to use the booking tracker or WhatsApp" value={c.ctaUrl} onChange={(v) => upd((n) => { n.ctaUrl = v; })} ph="https://" />
          </div>
        </Panel>
        <Panel id="attach" title="Link to an order" openState={open} setOpenState={setOpen}>
          <form action={attachItinerary.bind(null, id)} className="flex gap-2"><select name="bookingId" aria-label="Choose the order" className="input !py-2" value={bookingId} onChange={(e) => { setBookingId(e.target.value); const bc = bookings.find((x) => x.id === e.target.value)?.currency; if (bc) setCurr(bc); }}><option value="">Not attached</option>{bookings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select><button className="btn btn-outline !min-h-[44px]">Attach</button></form>
        </Panel>
        <Panel id="manage" title="Template, duplicate, delete" openState={open} setOpenState={setOpen}>
          <div className="space-y-3">
            <form action={saveAsTemplate.bind(null, id)} className="flex gap-2"><input name="templateName" placeholder="Template name" defaultValue={name} className="input !py-2" /><button className="btn btn-outline !min-h-[44px]" onClick={() => void 0}>Save as template</button></form>
            <div className="flex flex-wrap gap-2"><form action={duplicateItinerary.bind(null, id)}><button className="btn btn-outline">Duplicate</button></form>
              <form action={deleteItinerary.bind(null, id)}><button className="btn btn-outline text-red-700" onClick={(e) => { if (!confirm("Delete this itinerary?")) e.preventDefault(); }}>Delete</button></form></div>
            <p className="text-xs text-ink/65">Save as template copies the saved version without customer name or dates. Click Save first if you just made changes.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
