"use client";
import { useState } from "react";
import { track } from "./Tracker";

const INTERESTS = ["Pyramids & museums", "Nile cruise", "Luxor & Aswan", "Red Sea & beaches", "Food & culture", "Adventure"];
export default function LeadForm({ kind, cta }: { kind: "TRIP_BUILDER" | "CONTACT"; cta: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [interests, setInterests] = useState<string[]>([]);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setState("busy");
    const fd = new FormData(e.currentTarget); const g = (k: string) => (String(fd.get(k) ?? "").trim() || undefined);
    const extra = kind === "TRIP_BUILDER" ? [`From: ${g("from") ?? "?"}`, `Days: ${g("days") ?? "?"}`, `Travelling as: ${g("group") ?? "?"}`, `Style: ${g("style") ?? "?"}`, `Adventure level: ${g("level") ?? "?"}`, `Hotel: ${g("hotel") ?? "?"}`, `Cities: ${g("cities") ?? "?"}`].join(" | ") : "";
    const body = { kind, name: g("name"), email: g("email"), whatsapp: g("whatsapp"), country: g("from") ?? g("country"), travelDates: g("dates"), travelers: g("travelers") ? Number(g("travelers")) : undefined, budget: g("budget"), interests: interests.join(", ") || undefined, message: [g("message"), extra].filter(Boolean).join("\n") || undefined, consentMarketing: fd.get("consent") === "on", website: g("website") ?? "", source: "website-" + kind.toLowerCase() };
    const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { setState("done"); track(kind === "TRIP_BUILDER" ? "custom_trip_complete" : "contact_form"); } else setState("error");
  }
  if (state === "done") return <div className="card p-6"><p className="font-display text-xl font-bold">Got it, thank you.</p><p className="mt-2 text-ink/70">We'll reply within one working day with ideas and a price. Prefer to chat now? Use the WhatsApp button.</p></div>;
  return (
    <form onSubmit={onSubmit} onFocus={() => kind === "TRIP_BUILDER" && track("custom_trip_start")} className="card space-y-4 p-5">
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="l-name">Name</label><input id="l-name" name="name" required className="input" autoComplete="name" /></div>
        <div><label className="label" htmlFor="l-email">Email</label><input id="l-email" name="email" type="email" required className="input" autoComplete="email" /></div>
        <div><label className="label" htmlFor="l-wa">WhatsApp (optional)</label><input id="l-wa" name="whatsapp" type="tel" className="input" /></div>
        <div><label className="label" htmlFor="l-from">{kind === "TRIP_BUILDER" ? "Where are you coming from?" : "Country"}</label><input id="l-from" name="from" className="input" /></div>
      </div>
      {kind === "TRIP_BUILDER" && <>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="l-dates">Travel dates</label><input id="l-dates" name="dates" placeholder="e.g. 12–17 November" className="input" /></div>
          <div><label className="label" htmlFor="l-days">Number of days</label><input id="l-days" name="days" type="number" min={1} max={30} className="input" /></div>
          <div><label className="label" htmlFor="l-travelers">Travelers</label><input id="l-travelers" name="travelers" type="number" min={1} max={40} defaultValue={2} className="input" /></div>
          <div><label className="label" htmlFor="l-group">Travelling as</label><select id="l-group" name="group" className="input"><option>Couple</option><option>Family</option><option>Friends</option><option>Solo</option></select></div>
          <div><label className="label" htmlFor="l-budget">Budget per person</label><select id="l-budget" name="budget" className="input"><option value="">Not sure yet</option><option>Under $500</option><option>$500–1,000</option><option>$1,000–2,000</option><option>$2,000+</option></select></div>
          <div><label className="label" htmlFor="l-style">Private or group</label><select id="l-style" name="style" className="input"><option>Private</option><option>Group</option><option>No preference</option></select></div>
          <div><label className="label" htmlFor="l-level">Adventure level</label><select id="l-level" name="level" className="input"><option>Relaxed</option><option>Balanced</option><option>Active</option></select></div>
          <div><label className="label" htmlFor="l-hotel">Hotel preference</label><select id="l-hotel" name="hotel" className="input"><option>Comfortable (3–4★)</option><option>Budget</option><option>Luxury (5★)</option></select></div>
        </div>
        <div><label className="label" htmlFor="l-cities">Cities you have in mind</label><input id="l-cities" name="cities" placeholder="Cairo, Luxor, Aswan…" className="input" /></div>
        <fieldset><legend className="label">Interests</legend><div className="flex flex-wrap gap-2">{INTERESTS.map((i) => (
          <label key={i} className={`cursor-pointer rounded-full border px-3 py-2 text-sm ${interests.includes(i) ? "border-ink bg-gold-500/30 font-semibold" : "border-ink/20"}`}><input type="checkbox" className="sr-only" checked={interests.includes(i)} onChange={() => setInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i])} />{i}</label>))}</div></fieldset>
      </>}
      <div><label className="label" htmlFor="l-msg">{kind === "TRIP_BUILDER" ? "Anything else we should know?" : "How can we help?"}</label><textarea id="l-msg" name="message" rows={4} className="input" required={kind === "CONTACT"} /></div>
      <label className="flex items-start gap-2 text-sm"><input name="consent" type="checkbox" className="mt-1 h-5 w-5 accent-black" />Send me a few helpful follow-ups about my trip. Unsubscribe any time.</label>
      <button disabled={state === "busy"} className="btn btn-primary w-full disabled:opacity-50">{state === "busy" ? "Sending…" : cta}</button>
      {state === "error" && <p role="alert" className="text-sm text-red-700">Something went wrong. Please try again or message us on WhatsApp.</p>}
    </form>
  );
}
