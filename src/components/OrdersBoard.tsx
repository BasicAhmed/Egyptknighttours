"use client";
import { useMemo, useState } from "react";
import OrderModal, { prefetchOrder } from "./OrderModal";
import Modal from "./Modal";
import { PILL, STATUS_LABEL, stageOf, money, shortDate, ago, daysUntil, nextStep, rowFromOrder, type Focus, type Stage } from "./order-ui";
import { orderCreate } from "@/app/admin/order-actions";
import { COUNTRIES } from "@/lib/countries";
import type { Order, OrderRow } from "@/lib/orders";

const TABS: { key: string; label: string; stages: Stage[] | null }[] = [
  { key: "todo", label: "To do", stages: ["NEW", "QUOTE"] }, { key: "pay", label: "Awaiting payment", stages: ["AWAITING", "PARTIAL"] },
  { key: "paid", label: "Confirmed", stages: ["PAID"] }, { key: "done", label: "Completed", stages: ["DONE"] }, { key: "all", label: "All", stages: null }, { key: "cancelled", label: "Cancelled", stages: ["CANCELLED"] },
];

export default function OrdersBoard({ initial, tours, openId }: { initial: OrderRow[]; tours: { id: string; title: string }[]; openId?: string }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState("todo"); const [q, setQ] = useState(""); const [sort, setSort] = useState<"new" | "trip">("new"); const [soon, setSoon] = useState(false);
  const [open, setOpen] = useState<{ id: string; focus: Focus | null } | null>(openId ? { id: openId, focus: null } : null);
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, rows.filter((r) => !t.stages || t.stages.includes(stageOf(r.status))).length])), [rows]);
  const travelSoon = useMemo(() => rows.filter((r) => ["PAID", "PARTIAL", "AWAITING", "NEW"].includes(stageOf(r.status)) && daysUntil(r.travelDate) >= 0 && daysUntil(r.travelDate) <= 7).length, [rows]);
  const list = useMemo(() => {
    const t = TABS.find((x) => x.key === tab)!; const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => (!t.stages || t.stages.includes(stageOf(r.status))) && (!soon || (daysUntil(r.travelDate) >= 0 && daysUntil(r.travelDate) <= 7)));
    if (needle) out = rows.filter((r) => `${r.ref} ${r.name} ${r.email} ${r.whatsapp} ${r.title} ${r.country} ${r.hotel}`.toLowerCase().includes(needle));
    return [...out].sort((a, b) => sort === "trip" ? a.travelDate.localeCompare(b.travelDate) : b.createdAt - a.createdAt);
  }, [rows, tab, q, sort, soon]);
  const openRow = open ? rows.find((r) => r.id === open.id) ?? null : null;
  const update = (o: Order) => setRows((rs) => rs.map((r) => (r.id === o.id ? rowFromOrder(o) : r)));

  const kpi = (label: string, value: number, on: () => void, tone = "") => <button onClick={on} className={`rounded-2xl border border-ink/10 bg-white p-3 text-left transition hover:border-ink/40 ${tone}`}><p className="text-xs font-semibold text-ink/65">{label}</p><p className="font-display text-3xl font-extrabold leading-none mt-1">{value}</p></button>;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Orders</h1><p className="text-sm text-ink/65">Tap an order to see everything and take the next step.</p></div><button className="btn btn-primary !min-h-[46px]" onClick={() => setCreating(true)}>+ New order</button></div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi("To do", counts.todo, () => { setTab("todo"); setSoon(false); }, counts.todo ? "border-gold-600" : "")}
        {kpi("Awaiting payment", counts.pay, () => { setTab("pay"); setSoon(false); })}
        {kpi("Travelling in 7 days", travelSoon, () => { setTab("all"); setSoon(true); })}
        {kpi("Confirmed", counts.paid, () => { setTab("paid"); setSoon(false); })}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1"><svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/65" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <input aria-label="Search orders" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, booking ID, phone, tour…" className="input !rounded-xl !bg-white !pl-11" /></div>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as "new" | "trip")} className="input !w-auto !bg-white"><option value="new">Newest first</option><option value="trip">Travel date</option></select>
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Order filters">
        {TABS.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key && !soon} onClick={() => { setTab(t.key); setSoon(false); }} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${tab === t.key && !soon ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70 hover:border-ink/40"}`}>{t.label} <span className={tab === t.key && !soon ? "text-white/70" : "text-ink/65"}>{counts[t.key]}</span></button>)}
        {soon && <span className="shrink-0 rounded-full border border-gold-600 bg-gold-500/25 px-4 py-2 text-sm font-semibold">Travelling in 7 days <button className="ml-1" onClick={() => setSoon(false)} aria-label="Clear filter">×</button></span>}
      </div>

      <ul className="mt-4 space-y-2.5">
        {list.map((r) => {
          const st = stageOf(r.status); const next = nextStep(r); const d = daysUntil(r.travelDate); const pct = r.total ? Math.min(100, Math.round((r.paid / r.total) * 100)) : 0;
          return (
            <li key={r.id}>
              <div onClick={() => setOpen({ id: r.id, focus: null })} onMouseEnter={() => prefetchOrder(r.id)} onTouchStart={() => prefetchOrder(r.id)}
                className="grid cursor-pointer gap-x-4 gap-y-2 rounded-2xl border border-ink/10 bg-white p-4 transition hover:border-ink/40 hover:shadow-sm md:grid-cols-[1.1fr_1.4fr_1fr_auto] md:items-center">
                <div className="min-w-0"><button type="button" onClick={(e) => { e.stopPropagation(); setOpen({ id: r.id, focus: null }); }} aria-label={`Open order ${r.ref} for ${r.name}`} className="block max-w-full truncate text-left font-display text-[17px] font-extrabold hover:underline">{r.name}</button><p className="truncate text-sm text-ink/65">{r.ref} · {ago(r.createdAt)}{r.country ? ` · ${r.country}` : ""}</p></div>
                <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{r.title}</p><p className="text-sm text-ink/65">{shortDate(r.travelDate)}{d >= 0 && d <= 14 ? <b className={d <= 3 ? "text-red-700" : "text-[#8A4B0A]"}> · {d === 0 ? "today" : `in ${d}d`}</b> : ""} · {r.pax} traveler{r.pax > 1 ? "s" : ""}{r.hotel ? ` · ${r.hotel}` : ""}</p></div>
                <div><p className="text-sm"><b>{money(r.paid, r.currency)}</b> <span className="text-ink/65">of {money(r.total, r.currency)}</span></p><div className="mt-1 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} /></div>
                  <p className="mt-1 text-xs text-ink/65">{r.invoices ? `Invoice ${r.invoiceSent ? "sent" : "made"}` : "No invoice"}{r.itineraries ? ` · Itinerary ${r.itinerarySent ? "sent" : "made"}` : ""}</p>
                  {["AWAITING", "PARTIAL", "PAID"].includes(st) && <p className="mt-0.5 text-xs font-semibold"><span className={r.guideName ? "text-ink/65" : "text-[#8A4B0A]"}>{r.guideName ? `Guide: ${r.guideName}` : "No guide yet"}</span><span className={r.passports >= r.pax ? "text-[#17663A]" : "text-[#8A4B0A]"}> · Passports {r.passports}/{r.pax}</span></p>}</div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end"><span className={`rounded-full px-3 py-1 text-xs font-bold ${PILL[st]}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                  {next && <button className="btn btn-dark !min-h-[38px] !py-1.5 !px-3.5 !text-[13px]" onClick={(e) => { e.stopPropagation(); setOpen({ id: r.id, focus: next.focus }); }}>{next.label}</button>}</div>
              </div>
            </li>);
        })}
        {!list.length && <li className="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center text-ink/65">{q ? "No orders match your search." : "Nothing here. You're all caught up."}</li>}
      </ul>

      {openRow && <OrderModal key={openRow.id} row={openRow} focus={open?.focus} onClose={() => setOpen(null)} onChanged={update} />}
      {creating && <NewOrder tours={tours} onClose={() => setCreating(false)} onCreated={(o) => { setRows((rs) => [rowFromOrder(o), ...rs]); setTab("todo"); setCreating(false); setOpen({ id: o.id, focus: "invoice" }); }} />}
    </div>
  );
}

function NewOrder({ tours, onClose, onCreated }: { tours: { id: string; title: string }[]; onClose: () => void; onCreated: (o: Order) => void }) {
  const [v, setV] = useState({ name: "", email: "", whatsapp: "", country: "", tourId: "custom", customTitle: "", travelDate: "", adults: "2", children: "0", total: "", currency: "USD", depositPercent: "50", hotel: "", notes: "", nationality: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try { const r = await orderCreate(v); if (r.ok && r.order) onCreated(r.order); else setErr(r.message); } catch { setErr("Something went wrong. Please try again."); } finally { setBusy(false); }
  }
  const F = ({ k, label, type = "text", req = false, cls = "", ph }: { k: keyof typeof v; label: string; type?: string; req?: boolean; cls?: string; ph?: string }) => <div className={cls}><label className="label" htmlFor={`n-${k}`}>{label}</label><input id={`n-${k}`} className="input !py-2.5" type={type} required={req} placeholder={ph} value={v[k]} onChange={set(k)} /></div>;
  return (
    <Modal onClose={onClose} title="New order" subtitle="For customers who booked by WhatsApp, phone or email">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <F k="name" label="Customer name" req /><F k="whatsapp" label="WhatsApp number (with country code)" type="tel" req ph="+351 912 345 678" />
        <F k="email" label="Email" type="email" req /><div><label className="label" htmlFor="n-nat">Nationality</label><input id="n-nat" list="n-countries" className="input !py-2.5" value={v.nationality} onChange={set("nationality")} /><datalist id="n-countries">{COUNTRIES.map((x) => <option key={x} value={x} />)}</datalist></div><F k="country" label="Country of residence" />
        <div className="sm:col-span-2"><label className="label" htmlFor="n-tour">Experience</label><select id="n-tour" className="input !py-2.5" value={v.tourId} onChange={set("tourId")}><option value="custom">Custom experience (type the name)</option>{tours.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
        {v.tourId === "custom" && <F k="customTitle" label="Experience name" req cls="sm:col-span-2" ph="Cruise 4 Days 3 Nights MS Ciela" />}
        <F k="travelDate" label="Travel date" type="date" req /><F k="hotel" label="Pickup (hotel or airport)" ph="Aswan Airport" />
        <F k="adults" label="Adults" type="number" req /><F k="children" label="Children" type="number" />
        <F k="total" label="Total price" type="number" req /><div><label className="label" htmlFor="n-cur">Currency</label><select id="n-cur" className="input !py-2.5" value={v.currency} onChange={set("currency")}>{["USD", "EUR", "GBP", "EGP", "AED", "SAR"].map((c) => <option key={c}>{c}</option>)}</select></div>
        <F k="depositPercent" label="Deposit required (%)" type="number" />
        <div className="sm:col-span-2"><label className="label" htmlFor="n-notes">Notes / special requests</label><textarea id="n-notes" className="input !py-2.5" rows={2} value={v.notes} onChange={set("notes")} /></div>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-2">{err}</p>}
        <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="btn btn-primary !min-h-[48px] flex-1">{busy ? "Creating…" : "Create order"}</button><button type="button" onClick={onClose} className="btn btn-outline !min-h-[48px]">Cancel</button></div>
        <p className="text-xs text-ink/65 sm:col-span-2">After creating, you'll go straight to the invoice.</p>
      </form>
    </Modal>
  );
}
