"use client";
// The customer AI trip planner: chat, see the day-by-day plan, then "Send to our team" (email code + contact checks).
// The conversation lives on the server; this page only sends the next message.
import { useEffect, useRef, useState } from "react";
import type { Draft } from "@/lib/ai/rules";

type Msg = { who: "me" | "ai"; text: string };
const KEY = "ek.ai.conversation";
const store = { get: () => { try { return sessionStorage.getItem(KEY); } catch { return null; } }, set: (v: string) => { try { sessionStorage.setItem(KEY, v); } catch { /* fine */ } }, clear: () => { try { sessionStorage.removeItem(KEY); } catch { /* fine */ } } };
const post = async (url: string, body: unknown) => { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return (await r.json().catch(() => ({ ok: false, error: "Something went wrong. Please try again." }))) as Record<string, unknown> & { ok: boolean; error?: string }; };

export default function AiPlanner({ whatsapp }: { whatsapp: string }) {
  const [conv, setConv] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([{ who: "ai", text: "Hi! Tell me about your trip: how many days, which month, who's travelling and what you'd love to see. I'll build a day-by-day plan from our real tours." }]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [step, setStep] = useState<"chat" | "form" | "code" | "done">("chat");
  const [f, setF] = useState({ name: "", email: "", whatsapp: "", travelDate: "", adults: "2", children: "0", website: "" });
  const [code, setCode] = useState(""); const [done, setDone] = useState<{ ref: string; trackUrl: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { setConv(store.get()); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, draft]);

  const send = async () => {
    const t = text.trim(); if (!t || busy) return;
    setMsgs((m) => [...m, { who: "me", text: t }]); setText(""); setBusy(true); setErr("");
    const j = await post("/api/ai/chat", { conversationId: conv, message: t });
    setBusy(false);
    if (!j.ok) { setErr(j.error ?? "Something went wrong."); return; }
    setConv(String(j.conversationId)); store.set(String(j.conversationId));
    if (j.reply) setMsgs((m) => [...m, { who: "ai", text: String(j.reply) }]);
    if (j.draft) setDraft(j.draft as Draft);
  };
  const start = async () => { setBusy(true); setErr(""); const j = await post("/api/ai/submit", { step: "start", conversationId: conv, ...f }); setBusy(false); if (!j.ok) setErr(j.error ?? ""); else setStep("code"); };
  const confirm = async () => { setBusy(true); setErr(""); const j = await post("/api/ai/submit", { step: "confirm", conversationId: conv, code }); setBusy(false); if (!j.ok) { setErr(j.error ?? ""); return; } setDone({ ref: String(j.ref), trackUrl: String(j.trackUrl) }); setStep("done"); store.clear(); };
  const restart = () => { store.clear(); setConv(null); setDraft(null); setStep("chat"); setErr(""); setMsgs((m) => m.slice(0, 1)); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  if (step === "done" && done) return (
    <section className="rounded-2xl border-2 border-ink p-6 text-center" role="status">
      <p className="font-display text-2xl font-extrabold">Your plan is with our team</p>
      <p className="mt-2 text-ink/75">Request ID <b>{done.ref}</b>. We'll check it, fine-tune it and send your price, usually within a day. We've emailed you the details.</p>
      <a href={done.trackUrl} className="btn btn-primary mt-4">Open your booking page</a>
    </section>);

  return (
    <section aria-labelledby="ai-h" className="rounded-2xl border border-ink/15 bg-white p-4 shadow-[0_10px_30px_rgba(20,16,16,.06)] sm:p-5">
      <div className="flex items-center justify-between gap-2"><h2 id="ai-h" className="font-display text-xl font-extrabold">Plan your trip with AI</h2>{conv && step === "chat" && <button type="button" onClick={restart} className="text-sm font-semibold underline">Start over</button>}</div>
      <p className="text-sm text-ink/65">Built from our real tours. No price here: our team prices every trip.</p>

      <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`flex ${m.who === "me" ? "justify-end" : ""}`}><p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[15px] ${m.who === "me" ? "bg-ink text-white" : "bg-gold-500/15"}`}>{m.text}</p></div>)}
        {busy && step === "chat" && <p className="text-sm text-ink/60">Thinking…</p>}
        {draft && <div className="rounded-2xl border-2 border-gold-500 p-4">
          <p className="font-display text-lg font-extrabold">{draft.title}</p>{draft.summary && <p className="mt-1 text-sm text-ink/75">{draft.summary}</p>}
          <ol className="mt-3 space-y-2">{draft.days.map((d, i) => <li key={i} className="rounded-xl bg-ink/[.04] p-3"><p className="text-sm font-bold">Day {i + 1}{d.location ? ` · ${d.location}` : ""}: {d.title}</p><p className="mt-0.5 text-sm text-ink/75">{d.description}</p></li>)}</ol>
          {draft.notes && <p className="mt-2 text-sm text-ink/70">{draft.notes}</p>}
          {step === "chat" && <button type="button" onClick={() => setStep("form")} className="btn btn-primary mt-3 w-full sm:w-auto">Send to our team</button>}
        </div>}
        <div ref={end} />
      </div>

      {err && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{err} <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a></p>}

      {step === "chat" && <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <label htmlFor="ai-msg" className="sr-only">Your message</label>
        <textarea id="ai-msg" rows={2} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="e.g. 8 days in March, 2 adults, pyramids and a Nile cruise" className="input flex-1 !py-2" />
        <button disabled={busy || !text.trim()} className="btn btn-dark self-end">Send</button>
      </form>}

      {step === "form" && <form className="mt-4 grid gap-3 rounded-2xl bg-ink/[.04] p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void start(); }}>
        <p className="text-sm font-semibold sm:col-span-2">Where should we send your price? We'll email you a code to confirm it's you.</p>
        <label><span className="label">Full name</span><input required autoComplete="name" className="input" value={f.name} onChange={set("name")} /></label>
        <label><span className="label">Email</span><input required type="email" autoComplete="email" className="input" value={f.email} onChange={set("email")} /></label>
        <label><span className="label">WhatsApp with country code</span><input required type="tel" autoComplete="tel" placeholder="+44 7700 900123" className="input" value={f.whatsapp} onChange={set("whatsapp")} /></label>
        <label><span className="label">First travel day</span><input required type="date" min={tomorrow} className="input" value={f.travelDate} onChange={set("travelDate")} /></label>
        <label><span className="label">Adults</span><input required type="number" min={1} max={50} className="input" value={f.adults} onChange={set("adults")} /></label>
        <label><span className="label">Children (3–11)</span><input type="number" min={0} max={50} className="input" value={f.children} onChange={set("children")} /></label>
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={set("website")} name="website" />
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className="btn btn-primary">{busy ? "Sending…" : "Email me the code"}</button><button type="button" onClick={() => setStep("chat")} className="btn btn-outline">Back to the plan</button></div>
      </form>}

      {step === "code" && <form className="mt-4 rounded-2xl bg-ink/[.04] p-4" onSubmit={(e) => { e.preventDefault(); void confirm(); }}>
        <label className="block max-w-[260px]"><span className="label">The 6-digit code we emailed to {f.email}</span>
          <input required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} className="input text-center text-2xl tracking-[.4em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>
        <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy || code.length !== 6} className="btn btn-primary">{busy ? "Sending…" : "Send my plan"}</button><button type="button" onClick={() => setStep("form")} className="btn btn-outline">Change details / new code</button></div>
        <p className="mt-2 text-xs text-ink/60">Not there? Check your spam folder. The code works for 10 minutes.</p>
      </form>}
    </section>
  );
}
