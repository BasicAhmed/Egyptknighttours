"use client";
import { useState, useTransition } from "react";
import { saveItinerary, generateItineraryPdf, duplicateItinerary, saveAsTemplate, deleteItinerary, attachItinerary } from "@/app/admin/doc-actions";
import { blk, day as newDay, suggestHook, uid } from "@/lib/itinerary-templates";
import ImageField from "./ImageField";
import type { Block, BlockType, Day, ItineraryContent } from "@/pdf/types";

const TYPES: [BlockType, string][] = [["ACTIVITY", "Activity"], ["TOUR", "Tour"], ["TRANSFER", "Airport transfer"], ["TRANSPORT", "Transportation"], ["FLIGHT", "Flight"], ["HOTEL", "Hotel"], ["MEAL", "Restaurant / meal"], ["FREE_TIME", "Free time"], ["MEETING_POINT", "Meeting point"], ["GUIDE", "Guide information"], ["INFO", "Important information"], ["NOTE", "Notes"]];
type Init = { name: string; description: string; bookingId: string | null; costPrice: number | null; marginPercent: number | null; content: ItineraryContent };
type BookingOpt = { id: string; label: string; travelers: number };
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
const swap = <T,>(a: T[], i: number, j: number) => { if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; };
const In = ({ label, value, onChange, ph, type = "text", cls = "" }: { label: string; value: string; onChange: (v: string) => void; ph?: string; type?: string; cls?: string }) => (
  <label className={`block ${cls}`}><span className="label">{label}</span><input type={type} className="input !py-2 text-[15px]" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} /></label>);
const Ta = ({ label, value, onChange, rows = 3, cls = "" }: { label: string; value: string; onChange: (v: string) => void; rows?: number; cls?: string }) => (
  <label className={`block ${cls}`}><span className="label">{label}</span><textarea rows={rows} className="input !py-2 text-[15px]" value={value} onChange={(e) => onChange(e.target.value)} /></label>);
const Mini = ({ onClick, children, danger = false, disabled = false }: { onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) => <button type="button" onClick={onClick} disabled={disabled} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-30 ${danger ? "border-red-200 text-red-700 hover:bg-red-50" : "border-ink/20 hover:border-ink"}`}>{children}</button>;

// A collapsible panel used inside every tab, so a long tab can be tucked away without leaving the tab itself.
function Panel({ id, title, right, openState, setOpenState, children }: { id: string; title: string; right?: React.ReactNode; openState: Record<string, boolean>; setOpenState: (o: Record<string, boolean>) => void; children: React.ReactNode }) {
  const open = openState[id] ?? true;
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
  const priced = cost !== "" && margin !== "" && Number(cost) >= 0 && Number(margin) >= 0;
  const unitCalc = priced ? Math.round(Number(cost) * (1 + Number(margin) / 100) * 100) / 100 : null;
  const travelers = bookings.find((b) => b.id === bookingId)?.travelers ?? 1;
  const totalCalc = unitCalc != null ? Math.round(unitCalc * travelers * 100) / 100 : null;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  const [c, setC] = useState<ItineraryContent>(initial.content);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [tab, setTab] = useState<"content" | "days" | "price" | "booking">("content");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dayOpen, setDayOpen] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();
  const upd = (fn: (n: ItineraryContent) => void) => setC((p) => { const n = structuredClone(p); fn(n); return n; });
  const updDay = (i: number, fn: (d: Day) => void) => upd((n) => fn(n.days[i]));

  async function save(force = false): Promise<boolean> {
    const r = await saveItinerary(id, JSON.stringify({ name, description: desc, bookingId: bookingId || null, content: c, costPrice: cost === "" ? null : Number(cost), marginPercent: margin === "" ? null : Number(margin), force }));
    if (!r.ok && r.needsConfirm) { if (window.confirm(r.message)) return save(true); setMsg({ t: "Not saved — the order was left as it was.", err: true }); return false; }
    setMsg({ t: r.message, err: !r.ok }); return r.ok;
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

  const TABS = [["content", "Content"], ["days", `Days (${c.days.length})`], ["price", priced ? "Price ✓" : "Price"], ["booking", "Booking & sharing"]] as const;

  return (
    <div className="space-y-5 pb-24">
      <h1 className="sr-only">{isTemplate ? "Edit template" : "Edit itinerary"}: {name || "Untitled"}</h1>
      <div className="sticky top-14 z-20 -mx-4 border-b border-ink/10 bg-white/95 px-4 py-3 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Itinerary name" className="input !w-64 !py-2 font-semibold" />
          <span className="badge">{isTemplate ? "TEMPLATE" : status}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline !min-h-[40px] !py-2" disabled={pending} onClick={() => start(async () => { await save(); })}>Save</button>
            <button type="button" className="btn btn-outline !min-h-[40px] !py-2" disabled={pending} onClick={preview}>Preview PDF</button>
            {!isTemplate && <button type="button" className="btn btn-dark !min-h-[40px] !py-2" disabled={pending} onClick={() => generate(false)}>Generate PDF</button>}
            {!isTemplate && <button type="button" className="btn btn-primary !min-h-[40px] !py-2" disabled={pending} onClick={() => generate(true)}>Generate + email</button>}
          </div>
        </div>
        {msg && <p role="status" className={`mt-2 text-sm font-medium ${msg.err ? "text-red-700" : "text-[#17663A]"}`}>{pending ? "Working…" : msg.t}</p>}
        <div role="tablist" aria-label="Itinerary sections" className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${tab === k ? "border-ink bg-ink text-white" : "border-ink/15 text-ink/70 hover:border-ink/40"}`}>{l}</button>)}
        </div>
      </div>

      <div hidden={tab !== "content"} className="space-y-5">
        <Panel id="content" title="Cover and overview" openState={open} setOpenState={setOpen}>
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Trip title (cover)" value={c.title} onChange={(v) => upd((n) => { n.title = v; })} ph="Cairo & the Nile" />
            <In label="Subtitle" value={c.subtitle} onChange={(v) => upd((n) => { n.subtitle = v; })} ph="8 days, 7 nights" />
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
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold">Days <span className="text-base font-normal text-ink/65">({c.days.length})</span></h2><Mini onClick={() => upd((n) => { n.days.push(newDay("", "", "", [])); })}>+ Add day</Mini></div>
        {c.days.map((d, i) => (
          <section key={d.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setDayOpen({ ...dayOpen, [d.id]: !(dayOpen[d.id] ?? i < 2) })} className="text-left"><span className="font-display text-2xl font-extrabold text-ink">Day {i + 1}</span><span className="ml-3 font-semibold">{d.title || "Untitled day"}</span><span className="ml-2 text-sm text-ink/65">{d.location}</span></button>
              <div className="flex flex-wrap gap-1.5"><Mini disabled={i === 0} onClick={() => upd((n) => swap(n.days, i, i - 1))}>↑</Mini><Mini disabled={i === c.days.length - 1} onClick={() => upd((n) => swap(n.days, i, i + 1))}>↓</Mini>
                <Mini onClick={() => upd((n) => { const cp = structuredClone(n.days[i]); cp.id = uid(); cp.blocks.forEach((b) => { b.id = uid(); }); n.days.splice(i + 1, 0, cp); })}>Duplicate</Mini><Mini danger onClick={() => { if (confirm(`Delete Day ${i + 1}?`)) upd((n) => { n.days.splice(i, 1); }); }}>Delete</Mini></div>
            </div>
            {(dayOpen[d.id] ?? i < 2) && <div className="mt-4 space-y-4">
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
        <div><Mini onClick={() => upd((n) => { n.days.push(newDay("", "", "", [])); })}>+ Add day</Mini></div>
      </div>

      <div hidden={tab !== "price"} className="space-y-5">
        <Panel id="price" title="Price settings" openState={open} setOpenState={setOpen}>
          <p className="text-sm text-ink/65">Cost and price are always <b>per person</b>. Adding or removing a traveler on the linked order multiplies the total automatically — nothing to recalculate by hand.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="ip-cost">Cost per person ({currency}, no profit)</label><input id="ip-cost" type="number" min={0} step="any" className="input !py-2" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="hotel, guide, driver, entrance fees" /></div>
            <div><label className="label" htmlFor="ip-margin">Profit margin (%)</label><input id="ip-margin" type="number" min={0} step="any" className="input !py-2" value={margin} onChange={(e) => setMargin(e.target.value)} /></div>
            <div><span className="label">Price per person</span><p className="input flex items-center !py-2 font-semibold">{unitCalc != null ? fmt(unitCalc) : "—"}</p></div>
          </div>
          {bookingId ? (
            <div className="mt-3 rounded-xl border border-gold-600/40 bg-gold-500/10 p-3 text-sm">
              <b>{totalCalc != null ? fmt(totalCalc) : "—"} total</b> for {travelers} traveler{travelers === 1 ? "" : "s"} on the linked order ({unitCalc != null ? fmt(unitCalc) : "—"} × {travelers}).
              <p className="mt-1 text-xs text-ink/65">Required: saving sets the linked order's total and profit tracking to match.</p>
            </div>
          ) : <p className="mt-3 text-xs text-ink/65">Fills in the price line on the PDF. Link this itinerary to an order in the Booking tab to also set its total automatically.</p>}
        </Panel>
      </div>

      <div hidden={tab !== "booking"} className="space-y-5">
        <Panel id="closing" title="Closing page (drives the booking)" openState={open} setOpenState={setOpen}>
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="Button text" value={c.ctaLabel} onChange={(v) => upd((n) => { n.ctaLabel = v; })} ph="Complete your booking" />
            <Ta cls="sm:col-span-2" label="Payment terms" value={c.paymentTerms} onChange={(v) => upd((n) => { n.paymentTerms = v; })} rows={2} />
            <In cls="sm:col-span-2" label="Button link (payment link). Leave blank to use the booking tracker or WhatsApp" value={c.ctaUrl} onChange={(v) => upd((n) => { n.ctaUrl = v; })} ph="https://" />
          </div>
        </Panel>
        <Panel id="attach" title="Attach to a booking" openState={open} setOpenState={setOpen}>
          <form action={attachItinerary.bind(null, id)} className="flex gap-2"><select name="bookingId" aria-label="Choose the order" className="input !py-2" value={bookingId} onChange={(e) => setBookingId(e.target.value)}><option value="">Not attached</option>{bookings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select><button className="btn btn-outline !min-h-[44px]">Attach</button></form>
          {docs.length > 0 && <div className="mt-4"><p className="text-sm font-semibold">Generated PDFs</p><ul className="mt-1 space-y-1 text-sm">{docs.map((x) => <li key={x.id} className="flex flex-wrap items-center justify-between gap-2"><span>{x.number} · {x.created}{x.sent ? ` · sent ${x.sent}` : ""}</span><a className="underline" href={`/api/documents/${x.id}/pdf`}>Download</a></li>)}</ul></div>}
        </Panel>
        <Panel id="manage" title="Template and sharing" openState={open} setOpenState={setOpen}>
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
