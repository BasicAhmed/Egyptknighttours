"use client";
// The date picker for a tour that runs on fixed dates: each date as a large button, nothing else to choose from.
import { prettyDate } from "./Calendar";

export default function DateChoices({ dates, value, onChange, whatsapp }: { dates: string[]; value: string; onChange: (iso: string) => void; whatsapp?: string }) {
  if (!dates.length) return (
    <div role="status" className="rounded-xl bg-gold-500/15 p-4 text-sm">
      <p className="font-semibold">No upcoming dates for this tour right now.</p>
      <p className="mt-1 text-ink/75">New dates are added regularly. {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Message us on WhatsApp</a> : "Message us"} and we'll let you know.</p>
    </div>);
  return (
    <div role="radiogroup" aria-label="Available dates">
      <p className="mb-2 text-sm text-ink/70">{dates.length === 1 ? "This tour runs on one date:" : "This tour runs on these dates only:"}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {dates.map((d) => (
          <button key={d} type="button" role="radio" aria-checked={value === d} onClick={() => onChange(d)}
            className={`rounded-xl border px-4 py-3 text-left font-semibold transition ${value === d ? "border-ink bg-ink text-white" : "border-ink/20 bg-white hover:border-ink"}`}>{prettyDate(d)}</button>
        ))}
      </div>
    </div>
  );
}
