"use client";
import { useMemo, useState } from "react";
import Modal from "./Modal";
import { ago, waUrl } from "./order-ui";
import { setLead } from "@/app/admin/actions";

export type LeadRow = { id: string; name: string; email: string; whatsapp: string; phone: string; country: string; kind: string; status: string; source: string; travelDates: string; travelers: number | null; budget: string; interests: string; message: string; notes: string; consent: boolean; createdAt: number; nextFollowUp: string };
const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "QUOTE_SENT", "FOLLOW_UP", "BOOKED", "TRAVELING", "COMPLETED", "REPEAT_CUSTOMER", "LOST", "ABANDONED"];
const LABEL: Record<string, string> = { NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified", QUOTE_SENT: "Quote sent", FOLLOW_UP: "Follow up", BOOKED: "Booked", TRAVELING: "Travelling", COMPLETED: "Completed", REPEAT_CUSTOMER: "Repeat customer", LOST: "Lost", ABANDONED: "Abandoned checkout" };
const KIND: Record<string, string> = { INQUIRY: "Inquiry", TRIP_BUILDER: "Trip request", CONTACT: "Message", ABANDONED: "Checkout" };
const TABS: [string, string, string[] | null][] = [["open", "Open", ["NEW", "CONTACTED", "QUALIFIED", "QUOTE_SENT", "FOLLOW_UP", "ABANDONED"]], ["booked", "Booked", ["BOOKED", "TRAVELING", "COMPLETED", "REPEAT_CUSTOMER"]], ["lost", "Lost", ["LOST"]], ["all", "All", null]];
const tone = (s: string) => (s === "NEW" || s === "ABANDONED" ? "bg-gold-500/25 text-[#6B4A0C]" : s === "LOST" ? "bg-red-100 text-red-800" : ["BOOKED", "TRAVELING", "COMPLETED", "REPEAT_CUSTOMER"].includes(s) ? "bg-[#DFF3E6] text-[#17663A]" : "bg-[#E3EEFB] text-[#1D4E89]");

export default function LeadsBoard({ initial, canEdit }: { initial: LeadRow[]; canEdit: boolean }) {
  const [rows, setRows] = useState(initial); const [tab, setTab] = useState("open"); const [q, setQ] = useState(""); const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => { const t = TABS.find((x) => x[0] === tab)!; const n = q.trim().toLowerCase(); return rows.filter((r) => (!t[2] || t[2].includes(r.status)) && (!n || `${r.name} ${r.email} ${r.whatsapp} ${r.message} ${r.source}`.toLowerCase().includes(n))); }, [rows, tab, q]);
  const cur = rows.find((r) => r.id === open) ?? null;
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Inquiries</h1><p className="text-sm text-ink/65">People who asked a question, built a trip or started checkout. Reply fast, then turn them into orders.</p>
      <div className="mt-4"><input aria-label="Search inquiries" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="input !bg-white" /></div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">{TABS.map(([k, l, st]) => <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${tab === k ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70"}`}>{l} <span className={tab === k ? "text-white/70" : "text-ink/65"}>{rows.filter((r) => !st || st.includes(r.status)).length}</span></button>)}</div>
      <ul className="mt-4 space-y-2.5">{list.map((r) => (
        <li key={r.id}><button onClick={() => setOpen(r.id)} className="grid w-full gap-1 rounded-2xl border border-ink/10 bg-white p-4 text-left transition hover:border-ink/40 md:grid-cols-[1.2fr_2fr_auto] md:items-center">
          <span className="min-w-0"><span className="block truncate font-display text-[17px] font-extrabold">{r.name}</span><span className="block truncate text-sm text-ink/65">{KIND[r.kind] ?? r.kind} · {ago(r.createdAt)}{r.country ? ` · ${r.country}` : ""}</span></span>
          <span className="min-w-0 truncate text-sm text-ink/70">{r.message || r.interests || [r.travelDates, r.travelers ? `${r.travelers} travelers` : "", r.budget].filter(Boolean).join(" · ") || r.email}</span>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tone(r.status)}`}>{LABEL[r.status] ?? r.status}</span></button></li>))}
        {!list.length && <li className="rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center text-ink/65">No inquiries here.</li>}</ul>
      {cur && <LeadModal key={cur.id} r={cur} canEdit={canEdit} onClose={() => setOpen(null)} onSaved={(p) => setRows((rs) => rs.map((x) => (x.id === cur.id ? { ...x, ...p } : x)))} />}
    </div>
  );
}
function LeadModal({ r, canEdit, onClose, onSaved }: { r: LeadRow; canEdit: boolean; onClose: () => void; onSaved: (p: Partial<LeadRow>) => void }) {
  const [status, setStatus] = useState(r.status); const [next, setNext] = useState(r.nextFollowUp); const [notes, setNotes] = useState(r.notes); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const phone = r.whatsapp || r.phone; const first = r.name.split(" ")[0];
  async function save() { setBusy(true); try { const fd = new FormData(); fd.set("status", status); fd.set("next", next); fd.set("notes", notes); await setLead(r.id, fd); onSaved({ status, nextFollowUp: next, notes }); setMsg("Saved"); } catch { setMsg("Could not save. Try again."); } finally { setBusy(false); } }
  const Row = ({ k, v }: { k: string; v: string }) => v ? <div className="flex justify-between gap-4 py-1 text-sm"><span className="text-ink/65">{k}</span><span className="text-right font-medium">{v}</span></div> : null;
  return (
    <Modal onClose={onClose} title={r.name} subtitle={`${KIND[r.kind] ?? r.kind} · ${ago(r.createdAt)}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{phone && <a className="btn btn-wa !min-h-[44px]" target="_blank" rel="noopener noreferrer" href={waUrl(phone, `Hi ${first}, thanks for contacting Egypt Knight!`)}>WhatsApp {first}</a>}<a className="btn btn-outline !min-h-[44px]" href={`mailto:${r.email}`}>Email</a>{phone && <a className="btn btn-outline !min-h-[44px]" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Call</a>}</div>
        <div className="rounded-2xl border border-ink/10 p-4"><Row k="Email" v={r.email} /><Row k="WhatsApp" v={phone} /><Row k="Country" v={r.country} /><Row k="Travel dates" v={r.travelDates} /><Row k="Travelers" v={r.travelers ? String(r.travelers) : ""} /><Row k="Budget" v={r.budget} /><Row k="Interests" v={r.interests} /><Row k="Source" v={r.source} /><Row k="Marketing OK" v={r.consent ? "Yes" : "No"} /></div>
        {r.message && <div className="rounded-2xl bg-ink/[.04] p-4 text-sm"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink/65">Message</p><p className="whitespace-pre-line">{r.message}</p></div>}
        {canEdit && <div className="rounded-2xl border border-ink/10 p-4"><div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="ls">Status</label><select id="ls" className="input !py-2" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</select></div><div><label className="label" htmlFor="ln">Follow up on</label><input id="ln" type="date" className="input !py-2" value={next} onChange={(e) => setNext(e.target.value)} /></div></div>
          <label className="label mt-3" htmlFor="lo">Notes</label><textarea id="lo" rows={3} className="input !py-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="mt-3 flex items-center gap-3"><button disabled={busy} onClick={save} className="btn btn-primary !min-h-[46px]">{busy ? "Saving…" : "Save"}</button>{msg && <span role="status" className="text-sm font-semibold text-[#17663A]">{msg}</span>}</div></div>}
      </div>
    </Modal>
  );
}
