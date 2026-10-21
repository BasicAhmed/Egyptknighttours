"use client";
// "What we need from the customer" in the order window: add passport copies, the remaining balance (with its date) or a
// note, mark any as important, tick them off when received, and send the open list by email or WhatsApp. The customer sees
// the open ones at the top of their booking page. Wording comes from lib/customer-requests.ts, the same as their page.
import { useState } from "react";
import { orderAddRequest, orderSetRequestStatus, orderDeleteRequest, orderEmailRequests } from "@/app/admin/order-actions";
import { openRequests, requestText, defaultBalanceDue, REQUEST_KIND_LABEL, type RequestKind } from "@/lib/customer-requests";
import { waUrl, shortDate } from "./order-ui";
import type { Order } from "@/lib/orders";

type Res = { ok: boolean; message: string; order?: Order | null; warn?: boolean };
type Run = (fn: () => Promise<Res>) => Promise<Res | null>;

export function RequestsPanel({ o, busy, run }: { o: Order; busy: boolean; run: Run }) {
  const [adding, setAdding] = useState<RequestKind | null>(null);
  const [text, setText] = useState(""); const [important, setImportant] = useState(true); const [due, setDue] = useState("");
  const ctx = { balance: o.balance, currency: o.currency, travelDate: o.travelDate, travelers: o.adults + o.children + o.infants, ref: o.ref };
  const open = openRequests(o.customerRequests, o.balance);
  const closed = o.customerRequests.filter((r) => !open.some((x) => x.id === r.id));
  const phone = o.customer.whatsapp || o.customer.phone;
  const has = (k: RequestKind) => open.some((r) => r.kind === k);

  const start = (k: RequestKind) => { setAdding(k); setText(""); setImportant(k !== "NOTE"); setDue(k === "BALANCE" ? defaultBalanceDue(o.travelDate, o.balanceDaysBefore) ?? "" : ""); };
  const preview = adding ? requestText({ kind: adding, text, dueDate: due || null }, ctx) : null;
  const waText = `Hi ${o.customer.name.split(" ")[0]}, it's Egypt Knight Tours about your booking ${o.ref}. We still need:\n\n${open.map((r) => { const t = requestText(r, ctx); return `${r.important ? "❗ " : "• "}${t.title}: ${t.detail}`; }).join("\n\n")}\n\nYou can see this any time on your booking page: ${o.trackUrl}`;

  return (
    <section className="rounded-2xl border-2 border-gold-500/60 p-4" aria-labelledby="req-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="req-h" className="font-display text-base font-bold">What we need from the customer</h3>
        {open.length > 0 && <div className="flex flex-wrap gap-2">
          {o.customer.email && <button type="button" disabled={busy} onClick={() => void run(() => orderEmailRequests(o.id))} className="btn btn-dark !min-h-[38px] !px-3 !py-1.5 !text-[13px]">Email it to the customer</button>}
          {phone && <a href={waUrl(phone, waText)} target="_blank" rel="noopener noreferrer" className="btn btn-wa !min-h-[38px] !px-3 !py-1.5 !text-[13px]">Send on WhatsApp</a>}
        </div>}
      </div>
      <p className="mt-1 text-[13px] text-ink/65">Shown at the top of the customer's booking page until you mark it received.{o.balance <= 0 ? " The balance is fully paid, so a balance request is not shown." : ""}</p>

      {open.length > 0 ? <ul className="mt-3 space-y-2">{open.map((r) => { const t = requestText(r, ctx); return (
        <li key={r.id} className={`rounded-xl p-3 ${r.important ? "bg-red-50 ring-1 ring-red-200" : "bg-ink/[.04]"}`}>
          <p className="text-[14.5px] font-semibold">{r.important && <span className="mr-2 rounded bg-red-700 px-1.5 py-0.5 text-[11px] font-bold uppercase text-white">Important</span>}{t.title}</p>
          {t.detail && <p className="mt-0.5 text-[13.5px] text-ink/75">{t.detail}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-[13px] font-semibold">
            <button type="button" disabled={busy} onClick={() => void run(() => orderSetRequestStatus(o.id, r.id, "DONE"))} className="underline decoration-[#1F8A4C] decoration-2 underline-offset-4">Received ✓</button>
            <button type="button" disabled={busy} onClick={() => { if (window.confirm("Remove this request? The customer will no longer see it.")) void run(() => orderDeleteRequest(o.id, r.id)); }} className="text-red-700 underline underline-offset-4">Remove</button>
          </div>
        </li>); })}</ul>
        : <p className="mt-3 rounded-xl bg-ink/[.04] p-3 text-sm text-ink/70">Nothing asked for at the moment.</p>}

      {!adding ? <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || has("PASSPORTS")} onClick={() => start("PASSPORTS")} className="rounded-full border border-ink/20 px-3 py-1.5 text-[13px] font-semibold hover:border-ink disabled:opacity-40">+ Passport copies</button>
        <button type="button" disabled={busy || has("BALANCE") || o.balance <= 0} onClick={() => start("BALANCE")} className="rounded-full border border-ink/20 px-3 py-1.5 text-[13px] font-semibold hover:border-ink disabled:opacity-40">+ Remaining balance</button>
        <button type="button" disabled={busy} onClick={() => start("NOTE")} className="rounded-full border border-ink/20 px-3 py-1.5 text-[13px] font-semibold hover:border-ink disabled:opacity-40">+ Note or other</button>
      </div> : <form className="mt-3 space-y-2 rounded-xl bg-gold-500/15 p-3" onSubmit={(e) => { e.preventDefault(); const kind = adding; if (!kind) return; void run(() => orderAddRequest(o.id, { kind, text, important, dueDate: due })).then((r) => { if (r?.ok) setAdding(null); }); }}>
        <p className="text-sm font-semibold">{REQUEST_KIND_LABEL[adding]}</p>
        <label className="block"><span className="label">{adding === "NOTE" ? "Note for the customer (first line is the title)" : "Extra words for the customer (optional)"}</span>
          <textarea className="input !py-2" rows={adding === "NOTE" ? 3 : 2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} required={adding === "NOTE"} /></label>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block"><span className="label">{adding === "BALANCE" ? `Pay by (${o.balanceDaysBefore} days before travel)` : "By (optional)"}</span><input type="date" className="input !w-auto !py-2" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <label className="flex items-center gap-2 pb-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-black" checked={important} onChange={(e) => setImportant(e.target.checked)} />Important</label>
        </div>
        {preview && <div className="rounded-lg bg-white p-2.5 text-[13px]"><p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink/55">The customer will read</p><p className="font-semibold">{preview.title}</p>{preview.detail && <p className="text-ink/75">{preview.detail}</p>}</div>}
        <div className="flex gap-2"><button disabled={busy} className="btn btn-primary !min-h-[40px] !py-1.5">Add</button><button type="button" onClick={() => setAdding(null)} className="btn btn-outline !min-h-[40px] !py-1.5">Cancel</button></div>
      </form>}

      {closed.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer text-ink/65">Received or not needed ({closed.length})</summary>
        <ul className="mt-1 divide-y divide-ink/10">{closed.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 py-1.5 text-ink/70"><span>{requestText(r, ctx).title}{r.dueDate ? ` · by ${shortDate(r.dueDate)}` : ""}{r.status !== "DONE" ? " · balance paid" : ""}</span>
            {r.status === "DONE" && <button type="button" disabled={busy} onClick={() => void run(() => orderSetRequestStatus(o.id, r.id, "OPEN"))} className="text-[13px] font-semibold underline">Ask again</button>}</li>))}</ul>
      </details>}
    </section>
  );
}
