"use client";
// The staff assistant: chat, plus a Confirm card for every action it proposes. Only the action's id goes back to the server.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { aiStaffAsk, aiConfirm, aiCancel } from "@/app/admin/ai-actions";

type Action = { id: string; kind: string; summary: string; payload: Record<string, unknown>; status: string; result?: string };
type Item = { who: "me" | "ai"; text: string; actions?: Action[] };
const KIND: Record<string, string> = { SEND_EMAIL: "Send email", CREATE_ITINERARY: "Create itinerary", ADD_REQUEST: "Ask the customer", ADD_NOTE: "Add note", SET_STATUS: "Change status" };
const IDEAS = ["Which trips in the next 14 days are missing passports?", "Show me the leakage report for the last 30 days", "Who is waiting for a decision for more than 3 days? Draft a follow-up email for the oldest one", "Create a 5-day Cairo and Luxor itinerary draft for a family"];

function Detail({ a }: { a: Action }) {
  const p = a.payload;
  if (a.kind === "SEND_EMAIL") return <div className="mt-2 rounded-lg bg-white p-3 text-sm"><p><b>To:</b> the customer of {String(p.ref)} (email on file)</p><p><b>Subject:</b> {String(p.subject)}</p><p className="mt-2 whitespace-pre-line text-ink/80">{String(p.body)}</p></div>;
  if (a.kind === "CREATE_ITINERARY") { const d = p.draft as { title: string; days: { title: string; location: string; description: string }[] }; return <div className="mt-2 rounded-lg bg-white p-3 text-sm"><p className="font-semibold">{d.title}{p.ref ? ` · for ${String(p.ref)}` : ""}</p><ol className="mt-1 list-decimal pl-5">{d.days.map((x, i) => <li key={i}><b>{x.location}</b>: {x.title}</li>)}</ol></div>; }
  return null;
}

export default function AdminAssistant() {
  const [conv, setConv] = useState<string | null>(null); const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null); useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [items]);
  const ask = async (q: string) => {
    const t = q.trim(); if (!t || busy) return; setItems((x) => [...x, { who: "me", text: t }]); setText(""); setBusy(true); setErr("");
    const r = await aiStaffAsk(conv, t); setBusy(false);
    if (!r.ok) { setErr(r.message ?? "Something went wrong."); return; }
    setConv(r.conversationId ?? null); setItems((x) => [...x, { who: "ai", text: r.reply ?? "", actions: r.actions }]);
  };
  const decide = async (id: string, yes: boolean) => {
    setBusy(true); const r = yes ? await aiConfirm(id) : await aiCancel(id); setBusy(false);
    setItems((x) => x.map((it) => ({ ...it, actions: it.actions?.map((a) => (a.id === id ? { ...a, status: r.ok ? (yes ? "DONE" : "CANCELLED") : "FAILED", result: r.message } : a)) })));
  };
  const link = (s?: string) => { const m = /\[open:(\/admin\/[^\]\s]+)\]/.exec(s ?? ""); return m ? { text: (s ?? "").replace(m[0], "").trim(), href: m[1] } : { text: s ?? "", href: "" }; };
  return (
    <section className="rounded-2xl bg-white p-4 shadow-[0_1px_0_rgba(20,16,16,.04)] sm:p-5">
      {!items.length && <div><p className="text-sm font-semibold">Try:</p><div className="mt-2 flex flex-wrap gap-2">{IDEAS.map((q) => <button key={q} type="button" onClick={() => void ask(q)} className="rounded-full border border-ink/15 px-3 py-1.5 text-left text-[13px] hover:border-ink">{q}</button>)}</div></div>}
      <div className="max-h-[60vh] space-y-3 overflow-y-auto" aria-live="polite">
        {items.map((it, i) => <div key={i}>
          <div className={`flex ${it.who === "me" ? "justify-end" : ""}`}><p className={`max-w-[90%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[15px] ${it.who === "me" ? "bg-ink text-white" : "bg-ink/[.05]"}`}>{it.text}</p></div>
          {it.actions?.map((a) => { const r = link(a.result); return (
            <div key={a.id} className={`mt-2 rounded-xl border-2 p-3 ${a.status === "PENDING" ? "border-gold-500 bg-gold-500/10" : a.status === "DONE" ? "border-[#1F8A4C]/40 bg-[#E9F6EE]" : "border-ink/10 bg-ink/[.03]"}`}>
              <p className="text-[12px] font-bold uppercase tracking-wide text-ink/60">{KIND[a.kind] ?? a.kind} · {a.status === "PENDING" ? "waiting for you" : a.status === "DONE" ? "done" : a.status === "CANCELLED" ? "cancelled" : "not done"}</p>
              <p className="font-semibold">{a.summary}</p><Detail a={a} />
              {a.status === "PENDING" ? <div className="mt-2 flex gap-2"><button type="button" disabled={busy} onClick={() => void decide(a.id, true)} className="btn btn-primary !min-h-[40px] !py-1.5">Confirm</button><button type="button" disabled={busy} onClick={() => void decide(a.id, false)} className="btn btn-outline !min-h-[40px] !py-1.5">Cancel</button></div>
                : r.text && <p className="mt-1 text-sm">{r.text}{r.href && <> <Link href={r.href} className="font-semibold underline">Open it</Link></>}</p>}
            </div>); })}
        </div>)}
        {busy && <p className="text-sm text-ink/60">Working…</p>}<div ref={end} />
      </div>
      {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{err}</p>}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <label htmlFor="as-q" className="sr-only">Ask the assistant</label>
        <textarea id="as-q" rows={2} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(text); } }} placeholder="Ask about orders, or ask it to draft something" className="input flex-1 !py-2" />
        <button disabled={busy || !text.trim()} className="btn btn-dark self-end">Ask</button>
      </form>
      {items.length > 0 && <button type="button" onClick={() => { setItems([]); setConv(null); }} className="mt-2 text-sm font-semibold underline">New conversation</button>}
    </section>
  );
}
