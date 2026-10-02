"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import OrderModal, { prefetchOrder } from "./OrderModal";
import Modal from "./Modal";
import { PILL, STAGE_COLOR, STATUS_LABEL, SOURCE_LABEL, stageOf, money, shortDate, ago, daysUntil, nextStep, rowFromOrder, type Focus, type Stage } from "./order-ui";
import { orderCreate } from "@/app/admin/order-actions";
import { COUNTRIES } from "@/lib/countries";
import { F, FieldCtx, fieldApi } from "./FormField";
import type { Order, OrderRow } from "@/lib/orders";

const TABS: { key: string; label: string; stages: Stage[] | null }[] = [
  { key: "todo", label: "To do", stages: ["NEW", "QUOTE"] }, { key: "pay", label: "Awaiting payment", stages: ["AWAITING", "PARTIAL"] },
  { key: "paid", label: "Confirmed", stages: ["PAID"] }, { key: "done", label: "Completed", stages: ["DONE"] }, { key: "all", label: "All", stages: null }, { key: "cancelled", label: "Cancelled", stages: ["CANCELLED"] },
];

export default function OrdersBoard({ initial, tours, openId, canFinance = false }: { initial: OrderRow[]; tours: { id: string; title: string }[]; openId?: string; canFinance?: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial); useEffect(() => { setRows(initial); }, [initial]);
  const [tab, setTab] = useState("todo"); const [q, setQ] = useState(""); const [sort, setSort] = useState<"new" | "trip">("new"); const [soon, setSoon] = useState(false); const [src, setSrc] = useState("all");
  const [open, setOpen] = useState<{ id: string; focus: Focus | null } | null>(openId ? { id: openId, focus: null } : null);
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, rows.filter((r) => !t.stages || t.stages.includes(stageOf(r.status))).length])), [rows]);
  const travelSoon = useMemo(() => rows.filter((r) => ["PAID", "PARTIAL", "AWAITING", "NEW"].includes(stageOf(r.status)) && daysUntil(r.travelDate) >= 0 && daysUntil(r.travelDate) <= 7).length, [rows]);
  const list = useMemo(() => {
    const t = TABS.find((x) => x.key === tab)!; const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => (!t.stages || t.stages.includes(stageOf(r.status))) && (!soon || (daysUntil(r.travelDate) >= 0 && daysUntil(r.travelDate) <= 7)));
    if (needle) out = rows.filter((r) => `${r.ref} ${r.name} ${r.email} ${r.whatsapp} ${r.title} ${r.country} ${r.hotel}`.toLowerCase().includes(needle));
    if (src !== "all") out = out.filter((r) => r.source === src);
    return [...out].sort((a, b) => sort === "trip" ? a.travelDate.localeCompare(b.travelDate) : b.createdAt - a.createdAt);
  }, [rows, tab, q, sort, soon, src]);
  const openRow = open ? rows.find((r) => r.id === open.id) ?? null : null;
  const update = (o: Order) => setRows((rs) => rs.map((r) => (r.id === o.id ? rowFromOrder(o) : r)));

  const pick = (k: string) => { setTab(k); setSoon(false); };
  const DOT: Record<string, string> = { todo: STAGE_COLOR.NEW, pay: STAGE_COLOR.AWAITING, paid: STAGE_COLOR.PAID, done: STAGE_COLOR.DONE, all: "#141010", cancelled: STAGE_COLOR.CANCELLED };
  return (
    <div>
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="font-display text-[26px] font-extrabold leading-tight sm:text-[32px]">Orders</h1><p className="text-sm text-ink/60">{counts.todo ? `${counts.todo} waiting for you` : "Nothing waiting. You're all caught up."}{travelSoon ? `, ${travelSoon} travelling this week` : ""}</p></div><button className="btn btn-primary shrink-0" onClick={() => setCreating(true)}><span aria-hidden="true" className="-ml-0.5 text-lg leading-none">+</span>New order</button></div>

      {/* One strip does two jobs: it shows how many orders sit at each stage and it filters the list. */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0" role="tablist" aria-label="Order stages">
        {TABS.map((t) => { const sel = tab === t.key && !soon; return <button key={t.key} role="tab" aria-selected={sel} onClick={() => pick(t.key)} className={`min-w-[104px] shrink-0 rounded-[14px] px-3.5 py-3 text-left transition md:min-w-0 ${sel ? "bg-ink text-white shadow-[0_10px_24px_-12px_rgba(20,16,16,.6)]" : "bg-white text-ink hover:bg-white/70"}`}><span className="flex items-center gap-1.5 text-[12.5px] font-semibold"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: sel && t.key === "all" ? "#fff" : DOT[t.key] }} /><span className={sel ? "text-white/80" : "text-ink/65"}>{t.label}</span></span><span className="mt-1.5 block font-display text-[26px] font-extrabold leading-none">{counts[t.key]}</span></button>; })}
        <button role="tab" aria-selected={soon} onClick={() => { setTab("all"); setSoon(!soon); }} className={`min-w-[120px] shrink-0 rounded-[14px] px-3.5 py-3 text-left transition md:min-w-0 ${soon ? "bg-ink text-white shadow-[0_10px_24px_-12px_rgba(20,16,16,.6)]" : "bg-white text-ink hover:bg-white/70"}`}><span className="flex items-center gap-1.5 text-[12.5px] font-semibold"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={soon ? "text-gold-500" : "text-gold-700"}><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg><span className={soon ? "text-white/80" : "text-ink/65"}>This week</span></span><span className="mt-1.5 block font-display text-[26px] font-extrabold leading-none">{travelSoon}</span></button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1 basis-full sm:basis-0"><svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <input aria-label="Search orders" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, booking ID, phone, tour" className="input !border-transparent !bg-white !pl-11" /></div>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as "new" | "trip")} className="input !w-auto flex-1 !border-transparent !bg-white !text-[14.5px] sm:flex-none"><option value="new">Newest first</option><option value="trip">By travel date</option></select>
        <select aria-label="Filter by source" value={src} onChange={(e) => setSrc(e.target.value)} className="input !w-auto flex-1 !border-transparent !bg-white !text-[14.5px] sm:flex-none"><option value="all">All sources</option>{Object.entries(SOURCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>

      <ul className="mt-4 space-y-2">
        {list.map((r) => {
          const st = stageOf(r.status); const next = nextStep(r); const d = daysUntil(r.travelDate); const pct = r.total ? Math.min(100, Math.round((r.paid / r.total) * 100)) : 0;
          const dt = new Date(r.travelDate + "T00:00:00"); const live = !["DONE", "CANCELLED"].includes(st);
          return (
            <li key={r.id}>
              <div onClick={() => setOpen({ id: r.id, focus: null })} onMouseEnter={() => prefetchOrder(r.id)} onTouchStart={() => prefetchOrder(r.id)}
                className="flex cursor-pointer gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_0_rgba(20,16,16,.04)] transition hover:shadow-[0_10px_28px_-16px_rgba(20,16,16,.35)] sm:gap-4 sm:p-3.5">
                <div className="stub" style={{ "--stage": STAGE_COLOR[st] } as React.CSSProperties} title={shortDate(r.travelDate)}><b>{dt.getDate()}</b><i>{dt.toLocaleDateString("en-GB", { month: "short" })} {String(dt.getFullYear()).slice(2)}</i>{live && d >= 0 && d <= 14 && <em className={d <= 3 ? "bg-red-100 text-red-800" : "bg-gold-500/30 text-[#6B4A0C]"}>{d === 0 ? "today" : `in ${d}d`}</em>}</div>
                <div className="grid min-w-0 flex-1 gap-x-5 gap-y-2 md:grid-cols-[1.5fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><button type="button" onClick={(e) => { e.stopPropagation(); setOpen({ id: r.id, focus: null }); }} aria-label={`Open order ${r.ref} for ${r.name}`} className="min-w-0 truncate text-left font-display text-[17px] font-extrabold leading-tight hover:underline">{r.name}</button><span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${r.source === "VIATOR" ? "bg-[#2A5C8A]/10 text-[#2A5C8A]" : "bg-ink/[.06] text-ink/60"}`}>{SOURCE_LABEL[r.source] ?? r.source}</span></div>
                    <p className="mt-0.5 truncate text-[14.5px] font-medium text-ink/85">{r.title}</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink/55">{r.ref}, {r.pax} traveler{r.pax > 1 ? "s" : ""}{r.country ? `, ${r.country}` : ""}{r.hotel ? `, ${r.hotel}` : ""}, added {ago(r.createdAt)}</p>
                  </div>
                  <div className="min-w-0">{r.total > 0 ? <><p className="text-[14.5px]"><b>{money(r.paid, r.currency)}</b> <span className="text-ink/55">of {money(r.total, r.currency)}</span></p><div className="mt-1.5 h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? STAGE_COLOR.PAID : "#F0B050" }} /></div></> : <p className="text-[14.5px] font-semibold text-[#8A4B0A]">Not priced yet</p>}
                    <p className="mt-1 truncate text-[12.5px] text-ink/55">{r.invoices ? `Invoice ${r.invoiceSent ? "sent" : "made"}` : "No invoice"}{r.itineraries ? `, itinerary ${r.itinerarySent ? "sent" : "made"}` : ""}</p>
                    {["AWAITING", "PARTIAL", "PAID"].includes(st) && <p className="mt-0.5 truncate text-[12.5px] font-semibold"><span className={r.guideName ? "text-ink/60" : "text-[#8A4B0A]"}>{r.guideName ? `Guide: ${r.guideName}` : "No guide yet"}</span><span className={r.passports >= r.pax ? "text-[#17663A]" : "text-[#8A4B0A]"}>, passports {r.passports}/{r.pax}</span></p>}</div>
                  <div className="flex items-center gap-2 md:flex-col md:items-end"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PILL[st]}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                    {next && (next.href
                      ? <Link href={next.href} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="btn btn-dark ml-auto !min-h-[36px] !px-3.5 !py-1.5 !text-[13px] md:ml-0">{next.label}</Link>
                      : <button className="btn btn-dark ml-auto !min-h-[36px] !px-3.5 !py-1.5 !text-[13px] md:ml-0" onClick={(e) => { e.stopPropagation(); setOpen({ id: r.id, focus: next.focus }); }}>{next.label}</button>)}</div>
                </div>
              </div>
            </li>);
        })}
        {!list.length && <li className="rounded-2xl border border-dashed border-ink/20 px-6 py-12 text-center"><p className="font-display text-lg font-bold">{q ? "No orders match that search" : "No orders at this stage"}</p><p className="mt-1 text-sm text-ink/60">{q ? "Try a name, a booking ID or a phone number." : "Pick another stage above, or add a new order."}</p></li>}
      </ul>

      {openRow && <OrderModal key={openRow.id} row={openRow} focus={open?.focus} onClose={() => setOpen(null)} onChanged={update} canFinance={canFinance} />}
      {creating && <NewOrder tours={tours} onClose={() => setCreating(false)} onCreated={(o) => {
        setCreating(false); setRows((rs) => [rowFromOrder(o), ...rs]);
        // Already priced (e.g. Viator, paid in full up front): no need to send them straight to pricing — just open the order itself.
        if (o.total > 0) setOpen({ id: o.id, focus: null }); else router.push(`/admin/itineraries/new?bookingId=${o.id}`);
      }} />}
    </div>
  );
}

function NewOrder({ tours, onClose, onCreated }: { tours: { id: string; title: string }[]; onClose: () => void; onCreated: (o: Order) => void }) {
  const [v, setV] = useState({ source: "WHATSAPP", viatorTotal: "", name: "", email: "", whatsapp: "", country: "", tourId: "custom", customTitle: "", travelDate: "", adults: "2", children: "0", currency: "USD", hotel: "", notes: "", nationality: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!v.email.trim() && !v.whatsapp.trim()) { setErr("Enter the customer's email or WhatsApp number (at least one)."); return; }
    setBusy(true);
    try { const r = await orderCreate(v); if (r.ok && r.order) onCreated(r.order); else setErr(r.message); } catch { setErr("Something went wrong. Please try again."); } finally { setBusy(false); }
  }
  const ctx = fieldApi(v, set, "n-", "!py-2.5");
  return (
    <FieldCtx.Provider value={ctx}>
    <Modal onClose={onClose} title="New order" subtitle="For customers who booked by WhatsApp, phone or email">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="n-source">How was this booked?</label><select id="n-source" className="input !py-2.5" value={v.source} onChange={set("source")}><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="PHONE">Phone</option><option value="VIATOR">Viator</option></select></div>
        <F k="name" label="Customer name" req cls="sm:col-span-2" /><F k="whatsapp" label="WhatsApp number (with country code)" type="tel" ph="+351 912 345 678" />
        <F k="email" label="Email" type="email" /><p className="-mt-1 text-xs text-ink/60 sm:col-span-2">Email or WhatsApp — one is enough. You can add the other later from the order&apos;s Customer card.</p><div><label className="label" htmlFor="n-nat">Nationality</label><input id="n-nat" list="n-countries" className="input !py-2.5" value={v.nationality} onChange={set("nationality")} /><datalist id="n-countries">{COUNTRIES.map((x) => <option key={x} value={x} />)}</datalist></div><F k="country" label="Country of residence" />
        <div className="sm:col-span-2"><label className="label" htmlFor="n-tour">Experience</label><select id="n-tour" className="input !py-2.5" value={v.tourId} onChange={set("tourId")}><option value="custom">Custom experience (type the name)</option>{tours.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
        {v.tourId === "custom" && <F k="customTitle" label="Experience name" req cls="sm:col-span-2" ph="Cruise 4 Days 3 Nights MS Ciela" />}
        <F k="travelDate" label="Travel date" type="date" req /><F k="hotel" label="Pickup (hotel or airport)" ph="Aswan Airport" />
        <F k="adults" label="Adults" type="number" req /><F k="children" label="Children" type="number" />
        <div><label className="label" htmlFor="n-cur">Currency</label><select id="n-cur" className="input !py-2.5" value={v.currency} onChange={set("currency")}>{["USD", "EUR", "GBP", "EGP", "AED", "SAR"].map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="n-notes">Notes / special requests</label><textarea id="n-notes" className="input !py-2.5" rows={2} value={v.notes} onChange={set("notes")} /></div>
        {v.source === "VIATOR"
          ? <div className="sm:col-span-2 rounded-xl border border-gold-600/40 bg-gold-500/10 p-3">
              <label className="label" htmlFor="n-viatorTotal">Total the guest paid through Viator</label>
              <input id="n-viatorTotal" type="number" min={0} step="any" required className="input !py-2.5" value={v.viatorTotal} onChange={set("viatorTotal")} />
              <p className="mt-2 text-xs text-ink/65">Already paid, so this order is marked Paid right away — no deposit to collect. If there's an optional extra to charge for later, note it on the order's Notes tab instead.</p>
            </div>
          : <div className="sm:col-span-2 rounded-xl border border-gold-600/40 bg-gold-500/10 p-3 text-sm">No price yet — the next screen creates an itinerary for this customer, where you enter the cost and profit margin that set the price.</div>}
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-2">{err}</p>}
        <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="btn btn-primary !min-h-[48px] flex-1">{busy ? "Creating…" : "Create order"}</button><button type="button" onClick={onClose} className="btn btn-outline !min-h-[48px]">Cancel</button></div>
      </form>
    </Modal>
    </FieldCtx.Provider>
  );
}
