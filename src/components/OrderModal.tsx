"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { STATUS_LABEL, STATUS_OPTIONS, PILL, stageOf, money, shortDate, ago, waUrl, daysUntil, type Focus } from "./order-ui";
import { TravelersPanel, OpsPanel, completeness } from "./OrderPeople";
import { orderSyncTravelers, orderSetStatus, orderAddPayment, orderAddNote, orderCreateInvoice, orderEmailDoc, orderMarkSent, orderCreateItinerary, orderItineraryPdf, orderUpdate } from "@/app/admin/order-actions";
import type { Order, OrderRow } from "@/lib/orders";

const cache = new Map<string, Order>();
async function fetchOrder(id: string): Promise<Order> { const r = await fetch(`/api/admin/orders/${id}`, { cache: "no-store" }); if (!r.ok) throw new Error("load"); const o = (await r.json()) as Order; cache.set(id, o); return o; }
export function prefetchOrder(id: string) { if (!cache.has(id)) fetchOrder(id).catch(() => {}); }

type Res = { ok: boolean; message: string; order?: Order | null; id?: string; warn?: boolean };
const Card = ({ title, children, id, action }: { title: string; children: React.ReactNode; id?: string; action?: React.ReactNode }) => <section id={id} className="rounded-2xl border border-ink/10 p-4"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-display text-base font-extrabold">{title}</h3>{action}</div>{children}</section>;
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between gap-4 py-1 text-sm"><span className="text-ink/55">{k}</span><span className="text-right font-medium">{v}</span></div>;
const Small = "btn btn-outline !min-h-[38px] !py-1.5 !px-3 !text-[13px]";

export default function OrderModal({ row, focus, onClose, onChanged }: { row: OrderRow; focus?: Focus | null; onClose: () => void; onChanged: (o: Order) => void }) {
  const router = useRouter();
  const [o, setO] = useState<Order | null>(cache.get(row.id) ?? null);
  const [err, setErr] = useState(false); const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ t: string; ok: boolean; warn?: boolean } | null>(null);
  const [invOpen, setInvOpen] = useState(focus === "invoice"); const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "travelers" | "ops" | "money" | "notes">(focus ? "money" : "overview");
  const refs = { invoice: useRef<HTMLDivElement>(null), payment: useRef<HTMLDivElement>(null), itinerary: useRef<HTMLDivElement>(null) };

  useEffect(() => { let alive = true; fetchOrder(row.id).then((x) => alive && setO(x)).catch(() => alive && setErr(true)); return () => { alive = false; }; }, [row.id]);
  useEffect(() => { if (o && focus) setTimeout(() => refs[focus as keyof typeof refs]?.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); /* eslint-disable-next-line */ }, [!!o]);

  async function run(fn: () => Promise<Res>) {
    setBusy(true); setToast(null);
    try { const r = await fn(); if (r.order) { cache.set(row.id, r.order); setO(r.order); onChanged(r.order); } setToast({ t: r.message, ok: r.ok, warn: r.warn }); return r; }
    catch { setToast({ t: "Something went wrong. Please try again.", ok: false }); return null; } finally { setBusy(false); }
  }
  const refresh = async () => { const x = await fetchOrder(row.id); setO(x); onChanged(x); };
  useEffect(() => { if (o && o.travelers.length < o.adults + o.children + o.infants) void orderSyncTravelers(row.id).then((r) => { if (r.order) { cache.set(row.id, r.order); setO(r.order); onChanged(r.order); } }); /* eslint-disable-next-line */ }, [o?.id]);
  const first = (o?.customer.name ?? row.name).split(" ")[0];
  const stage = stageOf(o?.status ?? row.status);
  const status = o?.status ?? row.status;
  const pct = o ? Math.min(100, o.total ? Math.round((o.paid / o.total) * 100) : 0) : 0;
  const phone = o ? o.customer.whatsapp || o.customer.phone : row.whatsapp;

  return (
    <Modal onClose={onClose} wide title={<span className="flex flex-wrap items-center gap-2">{row.ref}<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PILL[stage]}`}>{STATUS_LABEL[status] ?? status}</span></span>} subtitle={`${o?.title ?? row.title} · ${row.name}`}>
      {toast && <p role={toast.ok ? "status" : "alert"} className={`mb-4 rounded-xl p-3 text-sm font-semibold ${toast.warn ? "bg-[#FFF3D6] text-[#7A4B00]" : toast.ok ? "bg-[#E9F6EE] text-[#17663A]" : "bg-red-50 text-red-800"}`}>{toast.t}</p>}
      {err && !o && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">Couldn't load this order. Close and try again.</p>}
      {!o && !err && <div className="animate-pulse space-y-3" aria-label="Loading"><div className="h-20 rounded-2xl bg-ink/5" /><div className="h-32 rounded-2xl bg-ink/5" /><div className="h-24 rounded-2xl bg-ink/5" /></div>}
      {o && <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {phone && <a className="btn btn-wa !min-h-[44px]" target="_blank" rel="noopener noreferrer" href={waUrl(phone, `Hi ${first}, it's Egypt Knight about your booking ${o.ref}.`)}>WhatsApp {first}</a>}
          {phone && <a className="btn btn-outline !min-h-[44px]" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Call</a>}
          <a className="btn btn-outline !min-h-[44px]" href={`mailto:${o.customer.email}`}>Email</a>
          <a className="btn btn-outline !min-h-[44px]" href={`/track/${o.ref}`} target="_blank" rel="noopener noreferrer">Customer view</a>
        </div>

        <div role="tablist" aria-label="Order sections" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {([["overview", "Overview"], ["travelers", `Travelers${completeness(o).withPassport < completeness(o).pax ? " •" : ""}`], ["ops", "Operations"], ["money", "Payment & documents"], ["notes", "Notes"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${tab === k ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70 hover:border-ink/40"}`}>{l}</button>)}
        </div>
        {tab === "overview" && <div className="space-y-4">
        <Checklist o={o} go={(t) => setTab(t)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Customer"><Row k="Name" v={o.customer.name} /><Row k="Email" v={o.customer.email} /><Row k="WhatsApp" v={phone || "–"} /><Row k="Nationality" v={o.customer.nationality || o.travelers.find((t) => t.nationality)?.nationality || "–"} /><Row k="Country" v={o.customer.country || "–"} /></Card>
          <Card title="Trip" action={<button className="text-sm font-semibold underline decoration-gold-500 decoration-2 underline-offset-4" onClick={() => setEditOpen(!editOpen)}>{editOpen ? "Close" : "Edit"}</button>}>
            <Row k="Experience" v={o.title} /><Row k="Date" v={<>{shortDate(o.travelDate)}{daysUntil(o.travelDate) >= 0 && <span className="ml-1 text-ink/50">(in {daysUntil(o.travelDate)}d)</span>}</>} />
            <Row k="Travelers" v={`${o.adults} adult${o.adults > 1 ? "s" : ""}${o.children ? `, ${o.children} child` : ""}${o.infants ? `, ${o.infants} infant` : ""}`} /><Row k="Style" v={o.isPrivate ? "Private" : "Shared"} />
            <Row k="Pickup" v={o.hotel || "Not given"} />{o.pickupNotes && <Row k="Pickup notes" v={o.pickupNotes} />}{o.requests && <Row k="Requests" v={<span className="whitespace-pre-line">{o.requests}</span>} />}
            {o.addons.length > 0 && <Row k="Add-ons" v={o.addons.map((a) => a.name).join(", ")} />}
          </Card>
        </div>

        {editOpen && <EditForm o={o} busy={busy} onSave={(v) => run(() => orderUpdate(o.id, v)).then((r) => { if (r?.ok) setEditOpen(false); })} />}

        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink/[.04] p-3"><label className="text-sm font-semibold" htmlFor="st">Change status</label>
          <select id="st" className="input !w-auto !py-2" value={STATUS_OPTIONS.includes(o.status) ? o.status : "PENDING"} disabled={busy} onChange={(e) => run(() => orderSetStatus(o.id, e.target.value))}>{STATUS_OPTIONS.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}</select></div>
        </div>}
        {tab === "travelers" && <TravelersPanel o={o} busy={busy} run={run} refresh={refresh} />}
        {tab === "ops" && <OpsPanel key={JSON.stringify(o.ops) + o.dietary + o.hotel} o={o} busy={busy} run={run} />}
        {tab === "money" && <div className="space-y-4">
        <div ref={refs.payment}><Card title="Payment" id="payment">
          <div className="flex items-end justify-between"><p className="text-sm text-ink/60">Paid <b className="text-ink">{money(o.paid, o.currency)}</b> of {money(o.total, o.currency)}</p><p className="font-display text-xl font-extrabold">{o.balance > 0 ? `${money(o.balance, o.currency)} left` : "Paid in full"}</p></div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${pct}%` }} /></div>
          {o.payments.length > 0 && <ul className="mt-3 divide-y divide-ink/10 text-sm">{o.payments.map((p) => <li key={p.id} className="flex justify-between py-1.5"><span className="text-ink/70">{new Date(p.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {p.method}{p.note ? ` · ${p.note}` : ""}</span><b className={p.status === "PAID" ? "" : "text-ink/40"}>{money(p.amount, o.currency)}{p.status !== "PAID" && ` (${p.status.toLowerCase()})`}</b></li>)}</ul>}
          {o.balance > 0 && <PayForm o={o} busy={busy} onPay={(v) => run(() => orderAddPayment(o.id, v))} />}
        </Card></div>

        <div ref={refs.invoice}><Card title="Invoice" id="invoice" action={<button className={Small} onClick={() => setInvOpen(!invOpen)}>{invOpen ? "Close" : o.documents.some((d) => d.kind === "INVOICE") ? "New version" : "+ Create invoice"}</button>}>
          {invOpen && <InvoiceForm o={o} busy={busy} onCreate={(v) => run(() => orderCreateInvoice(o.id, v)).then((r) => { if (r?.ok) setInvOpen(false); })} />}
          <DocList o={o} kind="INVOICE" run={run} busy={busy} />
        </Card></div>

        <div ref={refs.itinerary}><Card title="Itinerary" id="itinerary">
          {o.itineraries.map((it) => (
            <div key={it.id} className="mb-2 rounded-xl bg-ink/[.04] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{it.name}<span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs">{it.status}</span></p>
              <div className="flex flex-wrap gap-2"><Link className={Small} href={`/admin/itineraries/${it.id}`}>Edit</Link><a className={Small} target="_blank" rel="noopener noreferrer" href={`/api/admin/preview/itinerary/${it.id}`}>Preview</a>
                <button className={Small} disabled={busy} onClick={() => run(() => orderItineraryPdf(o.id, it.id, false))}>Create PDF</button><button className="btn btn-dark !min-h-[38px] !py-1.5 !px-3 !text-[13px]" disabled={busy} onClick={() => run(() => orderItineraryPdf(o.id, it.id, true))}>Create + email</button></div></div></div>))}
          <DocList o={o} kind="ITINERARY" run={run} busy={busy} />
          <ItinCreate o={o} busy={busy} onCreate={(t, n) => run(() => orderCreateItinerary(o.id, t, n)).then((r) => { if (r?.ok && r.id) router.push(`/admin/itineraries/${r.id}`); })} />
        </Card></div>

        </div>}
        {tab === "notes" && <div className="space-y-4">
        <Card title="Notes and activity">
          <NoteForm busy={busy} onAdd={(t) => run(() => orderAddNote(o.id, t))} />
          <ul className="mt-3 space-y-2">{o.activity.map((a, i) => <li key={i} className="flex gap-3 text-sm"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.kind === "note" ? "bg-nile" : a.kind === "payment" ? "bg-[#1F7A46]" : a.kind === "doc" ? "bg-gold-600" : "bg-ink/30"}`} /><span className="flex-1"><span className={a.kind === "note" ? "font-medium" : ""}>{a.text}</span><span className="ml-2 text-xs text-ink/45">{ago(a.at)}</span></span></li>)}</ul>
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
  const [v, setV] = useState({ dueNow: String(o.defaults.dueNow), deadline: o.defaults.deadline, currency: o.defaults.currency, extras: "", notes: "", status: "AUTO", sendNow: true }); const [more, setMore] = useState(false);
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
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-black" checked={v.sendNow} onChange={(e) => setV({ ...v, sendNow: e.target.checked })} />Email it to {o.customer.email} now</label>
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} className="btn btn-primary !min-h-[44px]">{busy ? "Working…" : "Create invoice PDF"}</button><a className="btn btn-outline !min-h-[44px]" target="_blank" rel="noopener noreferrer" href={`/api/admin/preview/invoice/${o.id}?dueNow=${encodeURIComponent(v.dueNow)}&deadline=${v.deadline}&currency=${encodeURIComponent(v.currency)}`}>Preview</a></div>
    </form>
  );
}
function DocList({ o, kind, run, busy }: { o: Order; kind: "INVOICE" | "ITINERARY"; run: (fn: () => Promise<Res>) => Promise<Res | null>; busy: boolean }) {
  const docs = o.documents.filter((d) => d.kind === kind);
  const phone = o.customer.whatsapp || o.customer.phone;
  if (!docs.length) return kind === "INVOICE" ? <p className="text-sm text-ink/55">No invoice yet.</p> : null;
  return (
    <ul className="space-y-2">{docs.map((d) => (
      <li key={d.id} className="rounded-xl border border-ink/10 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{d.number}{d.amount != null && kind === "INVOICE" && <span className="font-normal text-ink/55"> · due {money(d.amount, d.currency)}</span>}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${d.sentAt ? "bg-[#DFF3E6] text-[#17663A]" : "bg-ink/10 text-ink/60"}`}>{d.sentAt ? `Sent ${ago(d.sentAt)}${d.sentVia ? ` · ${d.sentVia.toLowerCase()}` : ""}` : "Not sent yet"}</span></div>
        <div className="mt-2 flex flex-wrap gap-2"><a className={Small} target="_blank" rel="noopener noreferrer" href={`/api/documents/${d.id}/pdf?inline=1`}>Preview</a><a className={Small} href={`/api/documents/${d.id}/pdf`}>Download</a>
          <button className="btn btn-dark !min-h-[38px] !py-1.5 !px-3 !text-[13px]" disabled={busy} onClick={() => run(() => orderEmailDoc(o.id, d.id))}>{d.sentAt ? "Resend email" : "Email"}</button>
          {phone && <a className="btn btn-wa !min-h-[38px] !py-1.5 !px-3 !text-[13px]" target="_blank" rel="noopener noreferrer" href={waUrl(phone, `Hi ${o.customer.name.split(" ")[0]}, here's your ${kind === "INVOICE" ? "invoice" : "itinerary"} from Egypt Knight: ${d.shareUrl}`)} onClick={() => { if (!d.sentAt) void run(() => orderMarkSent(o.id, d.id, "WHATSAPP")); }}>Send on WhatsApp</a>}
          {!d.sentAt && <button className={Small} disabled={busy} onClick={() => run(() => orderMarkSent(o.id, d.id, "MANUAL"))}>Mark as sent</button>}</div></li>))}</ul>
  );
}
function ItinCreate({ o, busy, onCreate }: { o: Order; busy: boolean; onCreate: (t: string, name: string) => void }) {
  const [t, setT] = useState(""); const [n, setN] = useState(`${o.title} for ${o.customer.name}`);
  return (
    <form className="mt-3 grid gap-2 rounded-xl bg-gold-500/15 p-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); onCreate(t, n); }}>
      <div><label className="label" htmlFor="it">Start from</label><select id="it" className="input !py-2" value={t} onChange={(e) => setT(e.target.value)}><option value="">Blank itinerary</option>{o.templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div><label className="label" htmlFor="itn">Name</label><input id="itn" className="input !py-2" value={n} onChange={(e) => setN(e.target.value)} /></div>
      <div className="flex items-end"><button disabled={busy} className="btn btn-primary !min-h-[44px] w-full">+ New itinerary</button></div>
    </form>
  );
}
function NoteForm({ busy, onAdd }: { busy: boolean; onAdd: (t: string) => void }) {
  const [t, setT] = useState("");
  return <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t); setT(""); } }}><input aria-label="Add a note" className="input !py-2" value={t} onChange={(e) => setT(e.target.value)} placeholder="Add a note, e.g. customer will pay Friday" /><button disabled={busy || !t.trim()} className="btn btn-dark !min-h-[44px]">Add</button></form>;
}
function EditForm({ o, busy, onSave }: { o: Order; busy: boolean; onSave: (v: Record<string, unknown>) => void }) {
  const [v, setV] = useState({ travelDate: o.travelDate, adults: o.adults, children: o.children, infants: o.infants, total: o.total, currency: o.currency, hotel: o.hotel, pickupNotes: o.pickupNotes, requests: o.requests, titleOverride: o.titleOverride });
  const f = (k: keyof typeof v, label: string, type = "text", cls = "") => <div className={cls}><label className="label" htmlFor={`e-${k}`}>{label}</label><input id={`e-${k}`} type={type} className="input !py-2" value={String(v[k])} onChange={(e) => setV({ ...v, [k]: type === "number" ? e.target.value : e.target.value })} /></div>;
  return (
    <form className="grid gap-2 rounded-2xl border border-gold-600 bg-gold-500/10 p-4 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <h3 className="font-display font-extrabold sm:col-span-4">Edit order details</h3>
      {f("titleOverride", "Custom experience name (optional)", "text", "sm:col-span-4")}
      {f("travelDate", "Travel date", "date", "sm:col-span-2")}{f("total", "Total price", "number")}{f("currency", "Currency")}
      {f("adults", "Adults", "number")}{f("children", "Children", "number")}{f("infants", "Infants", "number")}{f("hotel", "Hotel / pickup")}
      {f("pickupNotes", "Pickup notes", "text", "sm:col-span-2")}{f("requests", "Requests", "text", "sm:col-span-2")}
      <div className="sm:col-span-4"><button disabled={busy} className="btn btn-dark !min-h-[44px]">Save changes</button></div>
    </form>
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
