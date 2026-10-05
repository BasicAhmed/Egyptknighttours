"use client";
import { COUNTRIES } from "@/lib/countries";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CopyButton from "./CopyButton";
import Modal from "./Modal";
import { STATUS_LABEL, STATUS_OPTIONS, PILL, SOURCE_LABEL, stageOf, money, shortDate, ago, waUrl, daysUntil, type Focus } from "./order-ui";
import { TravelersPanel, OpsPanel, completeness } from "./OrderPeople";
import { orderSetStyle, orderRemovePayment, orderUpdateCustomer, orderSyncTravelers, orderSetStatus, orderAddPayment, orderAddNote, orderCreateInvoice, orderEmailDoc, orderMarkSent, orderCreateItinerary, orderItineraryPdf, orderUpdate } from "@/app/admin/order-actions";
import type { Order, OrderRow } from "@/lib/orders";
import { orderPickup, styleLabel } from "@/lib/order-rules";

const cache = new Map<string, Order>();
async function fetchOrder(id: string): Promise<Order> { const r = await fetch(`/api/admin/orders/${id}`, { cache: "no-store" }); if (!r.ok) throw new Error("load"); const o = (await r.json()) as Order; cache.set(id, o); return o; }
export function prefetchOrder(id: string) { if (!cache.has(id)) fetchOrder(id).catch(() => {}); }

type Res = { ok: boolean; message: string; order?: Order | null; id?: string; warn?: boolean };
const Card = ({ title, children, id, action }: { title: string; children: React.ReactNode; id?: string; action?: React.ReactNode }) => <section id={id} className="rounded-2xl border border-ink/10 p-4"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display text-base font-extrabold">{title}</h2>{action}</div>{children}</section>;
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between gap-4 py-1 text-sm"><span className="text-ink/65">{k}</span><span className="text-right font-medium">{v}</span></div>;
const Small = "btn btn-outline !min-h-[38px] !py-1.5 !px-3 !text-[13px]";

export default function OrderModal({ row, focus, onClose, onChanged, canFinance = false }: { row: OrderRow; focus?: Focus | null; onClose: () => void; onChanged: (o: Order) => void; canFinance?: boolean }) {
  const router = useRouter();
  const [o, setO] = useState<Order | null>(cache.get(row.id) ?? null);
  const [err, setErr] = useState(false); const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean; warn?: boolean } | null>(null);
  const [invOpen, setInvOpen] = useState(focus === "invoice"); const [editOpen, setEditOpen] = useState(false); const [custOpen, setCustOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "travelers" | "ops" | "money" | "notes">(focus ? "money" : "overview");
  const [dirty, setDirty] = useState(false);
  const refs = { invoice: useRef<HTMLDivElement>(null), payment: useRef<HTMLDivElement>(null), itinerary: useRef<HTMLDivElement>(null) };

  useEffect(() => { let alive = true; fetchOrder(row.id).then((x) => alive && setO(x)).catch(() => alive && setErr(true)); return () => { alive = false; }; }, [row.id]);
  useEffect(() => { if (o && focus) setTimeout(() => refs[focus as keyof typeof refs]?.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); /* eslint-disable-next-line */ }, [!!o]);

  async function run(fn: () => Promise<Res>) {
    setBusy(true); setToast(null);
    try { const r = await fn(); if (r.order) { cache.set(row.id, r.order); setO(r.order); onChanged(r.order); } setToast({ t: r.message, ok: r.ok, warn: r.warn }); if (r.ok) setDirty(false); return r; }
    catch { setToast({ t: "Something went wrong. Please try again.", ok: false }); return null; } finally { setBusy(false); }
  }
  const guardedClose = () => { if (dirty && !window.confirm("You have unsaved changes in this order. Close without saving?")) return; onClose(); };
  const refresh = async () => { const x = await fetchOrder(row.id); setO(x); onChanged(x); };
  useEffect(() => { if (o && o.travelers.length < o.adults + o.children + o.infants) void orderSyncTravelers(row.id).then((r) => { if (r.order) { cache.set(row.id, r.order); setO(r.order); onChanged(r.order); } }); /* eslint-disable-next-line */ }, [o?.id]);
  const first = (o?.customer.name ?? row.name).split(" ")[0];
  const stage = stageOf(o?.status ?? row.status);
  const status = o?.status ?? row.status;
  const pct = o ? Math.min(100, o.total ? Math.round((o.paid / o.total) * 100) : 0) : 0;
  const phone = o ? o.customer.whatsapp || o.customer.phone : row.whatsapp;

  return (
    <Modal onClose={guardedClose} wide title={<span className="flex flex-wrap items-center gap-2">{row.ref}<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PILL[stage]}`}>{STATUS_LABEL[status] ?? status}</span></span>} subtitle={`${o?.title ?? row.title} · ${row.name}`}>
      {toast && <p role={toast.ok ? "status" : "alert"} className={`mb-4 rounded-xl p-3 text-sm font-semibold ${toast.warn ? "bg-[#FFF3D6] text-[#7A4B00]" : toast.ok ? "bg-[#E9F6EE] text-[#17663A]" : "bg-red-50 text-red-800"}`}>{toast.t}</p>}
      {err && !o && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">Couldn't load this order. Close and try again.</p>}
      {!o && !err && <div className="animate-pulse space-y-3" aria-label="Loading"><div className="h-20 rounded-2xl bg-ink/5" /><div className="h-32 rounded-2xl bg-ink/5" /><div className="h-24 rounded-2xl bg-ink/5" /></div>}
      {o && <div className="space-y-4">
        {/* At a glance: who, what, when, and how much is paid. */}
        <div className="rounded-2xl bg-ink p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="flex w-[54px] shrink-0 flex-col items-center rounded-xl bg-white/10 py-2 leading-none"><b className="font-display text-[22px] font-extrabold">{new Date(o.travelDate + "T00:00:00").getDate()}</b><span className="mt-1 text-[11px] font-semibold text-white/65">{new Date(o.travelDate + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}</span></div>
            <div className="min-w-0 flex-1"><p className="truncate font-display text-[18px] font-extrabold leading-tight">{o.customer.name}</p><p className="mt-0.5 truncate text-[14px] text-white/75">{o.title}</p>
              <p className="mt-0.5 text-[13px] text-white/55">{o.adults + o.children + o.infants} traveler{o.adults + o.children + o.infants > 1 ? "s" : ""}, {o.isPrivate ? "private" : "shared"}{daysUntil(o.travelDate) >= 0 && stage !== "DONE" && stage !== "CANCELLED" ? `, ${daysUntil(o.travelDate) === 0 ? "travelling today" : `in ${daysUntil(o.travelDate)} days`}` : ""}</p></div>
          </div>
          <div className="mt-3.5 flex items-end justify-between gap-3"><p className="text-[13.5px] text-white/65">{o.total > 0 ? <>Paid <b className="text-white">{money(o.paid, o.currency)}</b> of {money(o.total, o.currency)}</> : "No price yet"}</p><p className="font-display text-[17px] font-extrabold text-gold-500">{o.balance > 0 ? `${money(o.balance, o.currency)} left` : o.total > 0 ? "Paid in full" : ""}</p></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${pct}%` }} /></div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {phone && <a className="btn btn-wa !min-h-[40px] flex-1 !py-2 !text-[14px]" target="_blank" rel="noopener noreferrer" href={waUrl(phone, `Hi ${first}, it's Egypt Knight about your booking ${o.ref}.`)}>WhatsApp {first}</a>}
            {phone && <a className="rounded-[10px] border border-white/20 px-4 py-2 text-[14px] font-semibold hover:bg-white/10" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Call</a>}
            {o.customer.email && <a className="rounded-[10px] border border-white/20 px-4 py-2 text-[14px] font-semibold hover:bg-white/10" href={`mailto:${o.customer.email}`}>Email</a>}
          </div>
        </div>

        <Flow o={o} busy={busy} onStep={(s) => {
          if (s.href) { router.push(s.href); return; }
          if (s.complete) { void run(() => orderSetStatus(o.id, "COMPLETED")); return; }
          if (s.tab) { setTab(s.tab); if (s.focus === "invoice") setInvOpen(true); if (s.focus) setTimeout(() => refs[s.focus!]?.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }
        }} />

        <details className="group rounded-2xl bg-[#F7F5F0] px-4 py-3"><summary className="flex cursor-pointer items-center justify-between text-[14.5px] font-semibold">Messages and links<span aria-hidden="true" className="text-lg leading-none text-ink/45 transition-transform group-open:rotate-45">+</span></summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {phone && <a className="btn btn-wa !min-h-[42px] !py-2 !text-[14px]" target="_blank" rel="noopener noreferrer" href={waUrl(phone, o.welcomeMessage)}>Send welcome message</a>}
            {phone && <CopyButton text={o.welcomeMessage} label="Copy welcome message" className="btn btn-outline !min-h-[42px] !py-2 !text-[14px]" />}
            <a className="btn btn-outline !min-h-[42px] !py-2 !text-[14px]" href={o.trackUrl} target="_blank" rel="noopener noreferrer">Open customer view</a>
            <CopyButton text={o.trackUrl} label="Copy customer link" className="btn btn-outline !min-h-[42px] !py-2 !text-[14px]" />
            <CopyButton text={o.ref} label="Copy booking ID" className="btn btn-outline !min-h-[42px] !py-2 !text-[14px]" />
            {o.reviewUrl && <a className="btn btn-wa !min-h-[42px] !py-2 !text-[14px]" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${(phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${first}, thank you for traveling with ${o.companyName}! We would love it if you shared a quick review: ${o.reviewUrl}`)}`}>Send review link</a>}
            {o.reviewUrl && <CopyButton text={o.reviewUrl} label="Copy review link" className="btn btn-outline !min-h-[42px] !py-2 !text-[14px]" />}
          </div></details>

        <div role="tablist" aria-label="Order sections" className="no-scrollbar sticky -top-4 z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-white px-4 py-2 sm:-mx-6 sm:px-6">
          {([["overview", "Overview"], ["money", "Payment & documents"], ["travelers", `Travelers${completeness(o).withPassport < completeness(o).pax ? " •" : ""}`], ["ops", "Operations"], ["notes", "Notes"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`chip !bg-[#F3F1EC] ${tab === k ? "on !bg-ink" : ""}`}>{l}</button>)}
        </div>
        {tab === "overview" && <div className="space-y-4">
        <Checklist o={o} go={(t) => setTab(t)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Customer" action={<button className="text-sm font-semibold underline decoration-gold-500 decoration-2 underline-offset-4" onClick={() => setCustOpen(!custOpen)}>{custOpen ? "Close" : "Edit"}</button>}><Row k="Name" v={o.customer.name} /><Row k="Email" v={o.customer.email || "–"} /><Row k="WhatsApp" v={o.customer.whatsapp || "–"} />{o.customer.phone && o.customer.phone !== o.customer.whatsapp && <Row k="Phone" v={o.customer.phone} />}<Row k="Nationality" v={o.customer.nationality || o.travelers.find((t) => t.nationality)?.nationality || "–"} /><Row k="Country" v={o.customer.country || "–"} /></Card>
          <Card title="Trip" action={<button className="text-sm font-semibold underline decoration-gold-500 decoration-2 underline-offset-4" onClick={() => setEditOpen(!editOpen)}>{editOpen ? "Close" : "Edit"}</button>}>
            <Row k="Source" v={SOURCE_LABEL[o.source] ?? o.source} /><Row k="Experience" v={o.title} /><Row k="Date" v={<>{shortDate(o.travelDate)}{daysUntil(o.travelDate) >= 0 && <span className="ml-1 text-ink/65">(in {daysUntil(o.travelDate)}d)</span>}</>} />
            <Row k="Travelers" v={`${o.adults} adult${o.adults > 1 ? "s" : ""}${o.children ? `, ${o.children} child` : ""}${o.infants ? `, ${o.infants} infant` : ""}`} /><StyleRow o={o} busy={busy} onChange={(to) => run(() => orderSetStyle(o.id, to))} />
            <PickupRows o={o} />{o.requests && <Row k="Requests" v={<span className="whitespace-pre-line">{o.requests}</span>} />}
            {o.addons.length > 0 && <Row k="Add-ons" v={o.addons.map((a) => a.name).join(", ")} />}
          </Card>
        </div>

        {custOpen && <CustomerForm o={o} busy={busy} onSave={(v) => run(() => orderUpdateCustomer(o.id, v)).then((r) => { if (r?.ok) setCustOpen(false); })} />}
        {editOpen && <EditForm o={o} busy={busy} onSave={(v) => run(() => orderUpdate(o.id, v)).then((r) => { if (r?.ok) setEditOpen(false); })} />}

        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink/[.04] p-3"><label className="text-sm font-semibold" htmlFor="st">Change status</label>
          <select id="st" className="input !w-auto !py-2" value={STATUS_OPTIONS.includes(o.status) ? o.status : "PENDING"} disabled={busy} onChange={(e) => run(() => orderSetStatus(o.id, e.target.value))}>{STATUS_OPTIONS.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select></div>
        </div>}
        <div hidden={tab !== "travelers"} onInput={() => setDirty(true)}><TravelersPanel o={o} busy={busy} run={run} refresh={refresh} /></div>
        <div hidden={tab !== "ops"} onInput={() => setDirty(true)}><OpsPanel key={JSON.stringify([o.ops, o.pickup, o.pickupNotes, o.dietary, o.hotel])} o={o} busy={busy} run={run} /></div>
        {tab === "money" && <div className="space-y-4">
        <div ref={refs.payment}><Card title="Payment" id="payment">
          {o.prepaidVia && <div className="mb-3 rounded-xl bg-[#2A5C8A]/10 p-3 text-sm font-semibold text-[#2A5C8A]">Paid in full through {o.prepaidVia} — no deposit to track here. The customer's itinerary and tracking page show no price. If the guide should collect something on the day, enter it under Operations.</div>}
          {canFinance && (o.total > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink/5 p-3 text-sm">
              {o.costTotal != null ? <>
                <span>Cost <b className="text-ink">{money(o.costTotal, o.currency)}</b></span><span className="text-ink/30">·</span>
                <span>Profit <b className={o.total - o.costTotal >= 0 ? "text-[#17663A]" : "text-red-700"}>{money(o.total - o.costTotal, o.currency)}</b></span><span className="text-ink/30">·</span>
                <span>{o.costTotal > 0 && <><b className="text-ink">{Math.round(((o.total - o.costTotal) / o.costTotal) * 100)}%</b> on top of cost · </>}<b className="text-ink">{Math.round(((o.total - o.costTotal) / o.total) * 100)}%</b> of the price</span>
              </> : <span className="text-ink/65">No cost recorded, so profit is unknown for this order.</span>}
            </div>
          ) : (
            <div className="mb-3 rounded-xl border border-gold-600/40 bg-gold-500/10 p-3 text-sm font-semibold">Not priced yet — add an itinerary and enter its cost and profit margin to set this order's price.</div>
          ))}
          <div className="flex items-end justify-between"><p className="text-sm text-ink/65">Paid <b className="text-ink">{money(o.paid, o.currency)}</b> of {money(o.total, o.currency)}</p><p className="font-display text-xl font-extrabold">{o.balance > 0 ? `${money(o.balance, o.currency)} left` : o.total > 0 ? "Paid in full" : "Not priced yet"}</p></div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${pct}%` }} /></div>
          {o.payments.length > 0 && <ul className="mt-3 divide-y divide-ink/10 text-sm">{o.payments.map((p) => <li key={p.id} className="flex justify-between py-1.5"><span className="text-ink/70">{new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {p.method}{p.note ? ` · ${p.note}` : ""}</span><span className="flex items-center gap-3"><b>{money(p.amount, o.currency)}</b><button type="button" disabled={busy} aria-label={`Remove payment of ${money(p.amount, o.currency)}`} className="text-xs font-semibold text-red-700 underline underline-offset-2" onClick={() => { if (window.confirm(`Remove this ${money(p.amount, o.currency)} payment? Use this only for a payment entered by mistake. It stays in the order's history.`)) void run(() => orderRemovePayment(o.id, p.id)); }}>Remove</button></span></li>)}</ul>}
          {o.balance > 0 && <PayForm o={o} busy={busy} onPay={(v) => run(() => orderAddPayment(o.id, v))} />}
        </Card></div>

        <div ref={refs.invoice}><Card title="Invoice" id="invoice" action={<button className={Small} onClick={() => setInvOpen(!invOpen)}>{invOpen ? "Close" : o.documents.some((d) => d.kind === "INVOICE") ? "New version" : "+ Create invoice"}</button>}>
          {o.prepaidVia && <p className="mb-3 rounded-xl bg-[#2A5C8A]/10 p-3 text-[13.5px] text-[#2A5C8A]">This order was paid through {o.prepaidVia}. An invoice shows the customer the amounts recorded here, so create one only if you need to (for example to bill an extra).</p>}
          {invOpen && <InvoiceForm o={o} busy={busy} onCreate={(v) => run(() => orderCreateInvoice(o.id, v)).then((r) => { if (r?.ok) setInvOpen(false); })} />}
          <DocList o={o} kind="INVOICE" run={run} busy={busy} />
        </Card></div>

        <div ref={refs.itinerary}><Card title="Itinerary" id="itinerary">
          {o.itineraries.map((it) => (
            <div key={it.id} className="mb-2 rounded-xl bg-ink/[.04] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{it.name}<span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs">{it.status}</span></p>
              <div className="flex flex-wrap gap-2"><Link className={Small} href={`/admin/itineraries/${it.id}`}>Edit</Link><a className={Small} target="_blank" rel="noopener noreferrer" href={`/api/admin/preview/itinerary/${it.id}`}>Preview</a>
                <button className={Small} disabled={busy} onClick={() => run(() => orderItineraryPdf(o.id, it.id, false))}>Create PDF</button><button className="btn btn-dark !min-h-[38px] !py-1.5 !px-3 !text-[13px]" disabled={busy} onClick={() => run(() => orderItineraryPdf(o.id, it.id, true))}>Create + email</button></div></div></div>))}
          <DocList o={o} kind="ITINERARY" run={run} busy={busy} />
          {(o.itineraries.length === 0 || o.status === "COMPLETED") && <ItinCreate o={o} busy={busy} onImported={(id) => router.push(`/admin/itineraries/${id}`)} onCreate={(t, n) => run(() => orderCreateItinerary(o.id, t, n)).then((r) => { if (r?.ok && r.id) router.push(`/admin/itineraries/${r.id}`); })} />}
          {o.itineraries.length > 0 && o.status !== "COMPLETED" && <p className="mt-3 text-xs text-ink/60">One itinerary per order while the trip is active. Edit the one above, or mark the trip Completed to start a new one.</p>}
        </Card></div>

        </div>}
        {tab === "notes" && <div className="space-y-4">
        <Card title="Notes and activity">
          <NoteForm busy={busy} onAdd={(t) => run(() => orderAddNote(o.id, t))} />
          <ul className="mt-3 space-y-2">{o.activity.map((a, i) => <li key={i} className="flex gap-3 text-sm"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.kind === "note" ? "bg-nile" : a.kind === "payment" ? "bg-[#1F7A46]" : a.kind === "doc" ? "bg-gold-600" : "bg-ink/30"}`} /><span className="flex-1"><span className={a.kind === "note" ? "font-medium" : ""}>{a.text}</span><span className="ml-2 text-xs text-ink/65">{ago(a.at)}</span></span></li>)}</ul>
        </Card>

        </div>}
      </div>}
    </Modal>
  );
}

function PayForm({ o, busy, onPay }: { o: Order; busy: boolean; onPay: (v: { amount: number; method: string; note: string }) => void }) {
  const [amount, setAmount] = useState(String(o.balance)); const [method, setMethod] = useState(o.methods[0] ?? "Bank transfer"); const [note, setNote] = useState("");
  useEffect(() => setAmount(String(o.balance)), [o.balance]);
  return (
    <form className="mt-4 grid gap-2 rounded-xl bg-gold-500/15 p-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]" onSubmit={(e) => { e.preventDefault(); onPay({ amount: Number(amount), method, note }); setNote(""); }}>
      <div><label className="label" htmlFor="pa">Amount received</label><input id="pa" className="input !py-2" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div><label className="label" htmlFor="pm">Method</label><select id="pm" className="input !py-2" value={method} onChange={(e) => setMethod(e.target.value)}>{[...o.methods, "Cash", "Other"].map((m) => <option key={m}>{m}</option>)}</select></div>
      <div><label className="label" htmlFor="pn">Reference (optional)</label><input id="pn" className="input !py-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Transfer ref" /></div>
      <div className="flex items-end"><button disabled={busy} className="btn btn-primary w-full !min-h-[44px]">{Number(amount) >= o.balance ? "Mark as paid" : "Record payment"}</button></div>
    </form>
  );
}
function InvoiceForm({ o, busy, onCreate }: { o: Order; busy: boolean; onCreate: (v: { dueNow: number; deadline: string; currency: string; extras: string; notes: string; status: string; sendNow: boolean }) => void }) {
  const [v, setV] = useState({ dueNow: String(o.defaults.dueNow), deadline: o.defaults.deadline, currency: o.defaults.currency, extras: "", notes: "", status: "AUTO", sendNow: !!o.customer.email }); const [more, setMore] = useState(false);
  return (
    <form className="mb-3 rounded-xl bg-gold-500/15 p-3" onSubmit={(e) => { e.preventDefault(); onCreate({ ...v, dueNow: Number(v.dueNow) }); }}>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><label className="label" htmlFor="idn">Amount due now</label><input id="idn" className="input !py-2" type="number" step="0.01" value={v.dueNow} onChange={(e) => setV({ ...v, dueNow: e.target.value })} /></div>
        <div><label className="label" htmlFor="idl">Pay by</label><input id="idl" className="input !py-2" type="date" value={v.deadline} onChange={(e) => setV({ ...v, deadline: e.target.value })} /></div>
      </div>
      <button type="button" className="mt-2 text-sm font-semibold underline decoration-gold-500 decoration-2 underline-offset-4" onClick={() => setMore(!more)}>{more ? "Fewer options" : "More options"}</button>
      {more && <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div><label className="label" htmlFor="icu">Currency</label><input id="icu" className="input !py-2 uppercase" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })} /></div>
        <div><label className="label" htmlFor="ist">Order status after</label><select id="ist" className="input !py-2" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}><option value="AUTO">Awaiting payment (automatic)</option><option value="KEEP">Keep current status</option></select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="ixt">Extra fees or taxes (Label | amount, one per line)</label><textarea id="ixt" className="input !py-2" rows={2} value={v.extras} onChange={(e) => setV({ ...v, extras: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="ino">Note to customer</label><textarea id="ino" className="input !py-2" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div></div>}
      {o.customer.email ? <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-black" checked={v.sendNow} onChange={(e) => setV({ ...v, sendNow: e.target.checked })} />Email it to {o.customer.email} now</label>
        : <p className="mt-3 text-sm text-ink/70">No email on file for this customer — after creating it, send it with the WhatsApp button below (or add an email in the Customer card).</p>}
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} className="btn btn-primary !min-h-[44px]">{busy ? "Working…" : "Create invoice PDF"}</button><a className="btn btn-outline !min-h-[44px]" target="_blank" rel="noopener noreferrer" href={`/api/admin/preview/invoice/${o.id}?dueNow=${encodeURIComponent(v.dueNow)}&deadline=${v.deadline}&currency=${encodeURIComponent(v.currency)}`}>Preview</a></div>
    </form>
  );
}
function DocList({ o, kind, run, busy }: { o: Order; kind: "INVOICE" | "ITINERARY"; run: (fn: () => Promise<Res>) => Promise<Res | null>; busy: boolean }) {
  const docs = o.documents.filter((d) => d.kind === kind);
  const phone = o.customer.whatsapp || o.customer.phone;
  if (!docs.length) return kind === "INVOICE" ? <p className="text-sm text-ink/65">No invoice yet.</p> : null;
  return (
    <ul className="space-y-2">{docs.map((d) => (
      <li key={d.id} className="rounded-xl border border-ink/10 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{d.number}{d.amount != null && kind === "INVOICE" && <span className="font-normal text-ink/65"> · due {money(d.amount, d.currency)}</span>}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${d.sentAt ? "bg-[#DFF3E6] text-[#17663A]" : "bg-ink/10 text-ink/65"}`}>{d.sentAt ? `Sent ${ago(d.sentAt)}${d.sentVia ? ` · ${d.sentVia.toLowerCase()}` : ""}` : "Not sent yet"}</span></div>
        <div className="mt-2 flex flex-wrap gap-2"><a className={Small} target="_blank" rel="noopener noreferrer" href={`/api/documents/${d.id}/pdf?inline=1`}>Preview</a><a className={Small} href={`/api/documents/${d.id}/pdf`}>Download</a>
          {o.customer.email && <button className="btn btn-dark !min-h-[38px] !py-1.5 !px-3 !text-[13px]" disabled={busy} onClick={() => run(() => orderEmailDoc(o.id, d.id))}>{d.sentAt ? "Resend email" : "Email"}</button>}
          {phone && <a className="btn btn-wa !min-h-[38px] !py-1.5 !px-3 !text-[13px]" target="_blank" rel="noopener noreferrer" href={waUrl(phone, `Hi ${o.customer.name.split(" ")[0]}, here's your ${kind === "INVOICE" ? "invoice" : "itinerary"} from Egypt Knight: ${d.shareUrl}`)} onClick={() => { if (!d.sentAt) void run(() => orderMarkSent(o.id, d.id, "WHATSAPP")); }}>Send on WhatsApp</a>}
          {!d.sentAt && <button className={Small} disabled={busy} onClick={() => run(() => orderMarkSent(o.id, d.id, "MANUAL"))}>Mark as sent</button>}</div></li>))}</ul>
  );
}
function ItinCreate({ o, busy, onCreate, onImported }: { o: Order; busy: boolean; onCreate: (t: string, name: string) => void; onImported: (id: string) => void }) {
  const [t, setT] = useState(""); const [n, setN] = useState(`${o.title} for ${o.customer.name}`);
  const [up, setUp] = useState<{ busy: boolean; err?: string }>({ busy: false }); const file = useRef<HTMLInputElement>(null);
  async function importPdf(f: File | undefined) {
    if (!f) return; setUp({ busy: true });
    try {
      const fd = new FormData(); fd.set("file", f); fd.set("bookingId", o.id);
      const r = await fetch("/api/admin/itineraries/import", { method: "POST", body: fd }); const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { onImported(j.id); return; }
      setUp({ busy: false, err: j.error ?? (r.status === 413 ? "File is too large (4 MB limit)." : "Import failed. Try again.") });
    } catch { setUp({ busy: false, err: "Upload failed. Check your connection." }); }
    if (file.current) file.current.value = "";
  }
  const pdf = t === "__pdf";
  return (
    <form className="mt-3 grid gap-2 rounded-xl bg-gold-500/15 p-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (pdf) file.current?.click(); else onCreate(t, n); }}>
      <div><label className="label" htmlFor="it">Start from</label><select id="it" className="input !py-2" value={t} onChange={(e) => { setT(e.target.value); setUp({ busy: false }); }}>
        <option value="">Blank itinerary</option><option value="__pdf">Import from PDF</option>
        {o.templates.length > 0 && <optgroup label="Templates">{o.templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>}</select></div>
      {pdf ? <p className="self-end pb-2 text-xs text-ink/70">Upload a text PDF (up to 4 MB). Days, included list and price are read from it; the customer's name, travelers and dates come from this order.</p>
        : <div><label className="label" htmlFor="itn">Name</label><input id="itn" className="input !py-2" value={n} onChange={(e) => setN(e.target.value)} /></div>}
      <div className="flex items-end"><button disabled={busy || up.busy} className="btn btn-primary !min-h-[44px] w-full">{pdf ? (up.busy ? "Importing…" : "Choose PDF") : "+ New itinerary"}</button></div>
      <input ref={file} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Itinerary PDF" onChange={(e) => void importPdf(e.target.files?.[0])} />
      {up.err && <p role="alert" className="text-sm font-medium text-red-800 sm:col-span-3">{up.err}</p>}
    </form>
  );
}
function CustomerForm({ o, busy, onSave }: { o: Order; busy: boolean; onSave: (v: Record<string, string>) => void }) {
  const [v, setV] = useState({ name: o.customer.name, email: o.customer.email, whatsapp: o.customer.whatsapp, phone: o.customer.phone !== o.customer.whatsapp ? o.customer.phone : "", nationality: o.customer.nationality, country: o.customer.country });
  const none = !v.email.trim() && !v.whatsapp.trim() && !v.phone.trim();
  const f = (k: keyof typeof v, label: string, type = "text", ph = "", list?: string) => (
    <div><label className="label" htmlFor={`cu-${k}`}>{label}</label><input id={`cu-${k}`} type={type} list={list} className="input !py-2" value={v[k]} placeholder={ph} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>);
  return (
    <form className="card grid gap-3 p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (!none && v.name.trim().length >= 2) onSave(v); }}>
      <div className="sm:col-span-2">{f("name", "Name (for this order)")}</div>
      {f("email", "Email", "email")}{f("whatsapp", "WhatsApp number (with country code)", "tel", "+351 912 345 678")}
      {f("phone", "Other phone (if different)", "tel")}{f("nationality", "Nationality", "text", "", "cu-countries")}
      {f("country", "Country of residence", "text", "", "cu-countries")}<datalist id="cu-countries">{COUNTRIES.map((x) => <option key={x} value={x} />)}</datalist>
      <p className={`text-xs sm:col-span-2 ${none ? "font-semibold text-red-800" : "text-ink/60"}`}>{none ? "Keep at least one: email or WhatsApp." : "The name changes this order only. Email, phone, nationality and country update the customer on all their orders."}</p>
      <div className="flex gap-2 sm:col-span-2"><button disabled={busy || none || v.name.trim().length < 2} className="btn btn-dark !min-h-[44px]">Save customer</button></div>
    </form>
  );
}
// Private or shared, with what the change would do said before the button is tapped (worked out on the server: see order-style.ts).
function StyleRow({ o, busy, onChange }: { o: Order; busy: boolean; onChange: (to: "PRIVATE" | "SHARED") => Promise<Res | null> }) {
  const [open, setOpen] = useState(false); const sw = o.styleSwitch; const to = styleLabel(sw.toPrivate);
  return (
    <div className="py-1 text-sm" data-style={styleLabel(o.isPrivate)}>
      <div className="flex justify-between gap-4"><span className="text-ink/65">Style</span><span className="text-right font-medium">{styleLabel(o.isPrivate)}<button type="button" aria-expanded={open} className="ml-2 font-semibold underline decoration-gold-500 decoration-2 underline-offset-4" onClick={() => setOpen(!open)}>{open ? "Close" : "Change"}</button></span></div>
      {open && <div className="mt-2 rounded-xl bg-gold-500/15 p-3 text-left">
        {sw.ok ? <>
          <p className="text-[13.5px] text-ink/80">{sw.newTotal != null ? <>Changing to {to.toLowerCase()} changes the total from <b>{money(o.total, o.currency)}</b> to <b>{money(sw.newTotal, o.currency)}</b>. {sw.note}{o.paid > 0 ? ` ${money(o.paid, o.currency)} is already paid, and the status follows.` : ""}</> : sw.note}</p>
          <button type="button" disabled={busy} className="btn btn-dark mt-2 !min-h-[44px] w-full !py-2 sm:w-auto" onClick={() => void onChange(sw.toPrivate ? "PRIVATE" : "SHARED").then((r) => { if (r?.ok) setOpen(false); })}>Change to {to}</button>
        </> : <p role="note" className="text-[13.5px] font-semibold text-[#7A4B00]">{sw.why}</p>}
      </div>}
    </div>
  );
}
// Pickup as everything else shows it: the order's own text where it has one, else the tour's.
function PickupRows({ o }: { o: Order }) {
  const p = orderPickup(o);
  return <><Row k="Pickup" v={p.place || "Not given"} />{p.time && <Row k="Pickup time" v={p.time} />}{p.notes && <Row k="Pickup notes" v={p.notes} />}{p.meetingPoint && <Row k="Meeting point" v={<span className="whitespace-pre-line">{p.meetingPoint}</span>} />}</>;
}
function NoteForm({ busy, onAdd }: { busy: boolean; onAdd: (t: string) => void }) {
  const [t, setT] = useState("");
  return <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t); setT(""); } }}><input aria-label="Add a note" className="input !py-2" value={t} onChange={(e) => setT(e.target.value)} placeholder="Add a note, e.g. customer will pay Friday" /><button disabled={busy || !t.trim()} className="btn btn-dark !min-h-[44px]">Add</button></form>;
}
function EditForm({ o, busy, onSave }: { o: Order; busy: boolean; onSave: (v: Record<string, unknown>) => void }) {
  const [v, setV] = useState({ travelDate: o.travelDate, adults: o.adults, children: o.children, infants: o.infants, currency: o.currency, hotel: o.hotel, pickupNotes: o.pickupNotes, requests: o.requests, titleOverride: o.titleOverride });
  const f = (k: keyof typeof v, label: string, type = "text", cls = "") => <div className={cls}><label className="label" htmlFor={`e-${k}`}>{label}</label><input id={`e-${k}`} type={type} className="input !py-2" value={String(v[k])} onChange={(e) => setV({ ...v, [k]: type === "number" ? e.target.value : e.target.value })} /></div>;
  return (
    <form className="grid gap-2 rounded-2xl border border-gold-600 bg-gold-500/10 p-4 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <h3 className="font-display font-extrabold sm:col-span-4">Edit order details</h3>
      {f("titleOverride", "Custom experience name (optional)", "text", "sm:col-span-4")}
      {f("travelDate", "Travel date", "date", "sm:col-span-2")}{f("currency", "Currency")}
      {f("adults", "Adults", "number")}{f("children", "Children", "number")}{f("infants", "Infants", "number")}{f("hotel", "Hotel / pickup")}
      {f("pickupNotes", "Pickup notes", "text", "sm:col-span-2")}{f("requests", "Requests", "text", "sm:col-span-2")}
      <div className="sm:col-span-4"><button disabled={busy} className="btn btn-dark !min-h-[44px]">Save changes</button></div>
    </form>
  );
}

type Step = { label: string; why: string; tab?: "money" | "travelers" | "ops"; focus?: Focus; href?: string; complete?: boolean };
// The order's journey in five steps, with the one thing to do next. Staff never have to work out where an order stands.
function Flow({ o, busy, onStep }: { o: Order; busy: boolean; onStep: (s: Step) => void }) {
  const st = stageOf(o.status); const viator = !!o.prepaidVia;
  const inv = o.documents.filter((d) => d.kind === "INVOICE"); const itinDocs = o.documents.filter((d) => d.kind === "ITINERARY");
  const priced = o.total > 0 || viator; const invoiced = viator || inv.length > 0; const invSent = viator || inv.some((d) => d.sentAt);
  const paid = viator || (o.total > 0 && o.balance <= 0); const itinSent = itinDocs.some((d) => d.sentAt); const done = st === "DONE";
  const steps = [["Price", priced], ["Invoice", invSent], ["Payment", paid], ["Itinerary", itinSent], ["Trip done", done]] as const;
  const current = steps.findIndex(([, ok]) => !ok);
  const c = completeness(o); const past = daysUntil(o.travelDate) < 0;
  let next: Step | null = null;
  if (st === "CANCELLED") next = null;
  else if (!priced) next = o.itineraries.length ? { label: "Open itinerary to set the price", why: "The price comes from the itinerary: enter its cost and profit margin.", href: `/admin/itineraries/${o.itineraries[0].id}` } : { label: "Create the itinerary", why: "The itinerary sets this order's price, so it comes first.", tab: "money", focus: "itinerary" };
  else if (!invoiced) next = { label: "Create invoice", why: "The order has a price. Send the customer an invoice to collect it.", tab: "money", focus: "invoice" };
  else if (!invSent) next = { label: "Send the invoice", why: "The invoice is ready but hasn't been sent yet.", tab: "money", focus: "invoice" };
  else if (!paid) next = { label: "Record a payment", why: `${money(o.balance, o.currency)} is still to be paid.`, tab: "money", focus: "payment" };
  else if (!itinSent) next = { label: itinDocs.length || o.itineraries.length ? "Send the itinerary" : "Create the itinerary", why: "Paid. The customer now needs their day-by-day plan.", tab: "money", focus: "itinerary" };
  else if (c.missing.length && !done) next = { label: "Collect traveler details", why: `Still missing: ${c.missing.map((m) => m.label.toLowerCase()).join(", ")}.`, tab: c.missing[0].tab };
  else if (!done && past) next = { label: "Mark trip completed", why: "The travel date has passed.", complete: true };
  return (
    <div className="rounded-2xl border border-ink/10 p-3.5">
      {st === "CANCELLED" ? <p className="text-sm font-semibold text-red-800">This order is cancelled.</p> : <>
        <ol className="flex items-start">{steps.map(([l, ok], i) => (
          <li key={l} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === current ? "step" : undefined}>
            {i > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-[13px] h-0.5 w-full ${steps[i - 1][1] && (ok || i === current) ? "bg-[#1F8A4C]" : "bg-ink/10"}`} />}
            <span className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-bold ${ok ? "bg-[#1F8A4C] text-white" : i === current ? "bg-gold-500 text-ink ring-4 ring-gold-500/25" : "bg-[#EFEDE7] text-ink/50"}`}>{ok ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : i + 1}<span className="sr-only">{ok ? " done" : i === current ? " current" : ""}</span></span>
            <span className={`mt-1.5 text-[11.5px] font-semibold leading-tight ${ok || i === current ? "text-ink" : "text-ink/50"}`}>{l}</span>
          </li>))}</ol>
        {next ? <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-500/15 p-3"><div className="min-w-0"><p className="text-[12.5px] font-semibold text-[#6B4A0C]">Next step</p><p className="text-[14px] text-ink/80">{next.why}</p></div><button type="button" disabled={busy} onClick={() => onStep(next!)} className="btn btn-dark !min-h-[42px] w-full !py-2 sm:w-auto">{next.label}</button></div>
          : <p className="mt-3.5 rounded-xl bg-[#E9F6EE] px-3 py-2.5 text-sm font-semibold text-[#17663A]">{done ? "Trip completed. Nothing left to do." : "Everything is in place for this trip."}</p>}
      </>}
    </div>
  );
}

function Checklist({ o, go }: { o: Order; go: (t: "travelers" | "ops") => void }) {
  const c = completeness(o);
  if (!c.missing.length) return <p className="rounded-xl bg-[#E9F6EE] px-4 py-2.5 text-sm font-semibold text-[#17663A]">✓ Traveler and operations details are complete.</p>;
  return (
    <div className="rounded-2xl border border-gold-600/40 bg-gold-500/10 p-3"><p className="mb-2 text-sm font-bold">Still to collect</p>
      <div className="flex flex-wrap gap-2">{c.missing.map((m) => <button key={m.label} type="button" onClick={() => go(m.tab)} className="rounded-full border border-ink/20 bg-white px-3 py-1.5 text-sm font-semibold hover:border-ink">{m.label}</button>)}</div></div>
  );
}
