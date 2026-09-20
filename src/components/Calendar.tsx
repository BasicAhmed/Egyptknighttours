"use client";
import { useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const tomorrowISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return toISO(d); };
export const prettyDate = (s: string) => fromISO(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default function Calendar({ value, onChange, min }: { value: string; onChange: (iso: string) => void; min: string }) {
  const minD = fromISO(min);
  const start = value ? fromISO(value) : minD;
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const first = new Date(view.y, view.m, 1);
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const blanks = first.getDay();
  const canPrev = view.y > minD.getFullYear() || (view.y === minD.getFullYear() && view.m > minD.getMonth());
  const shift = (n: number) => { const d = new Date(view.y, view.m + n, 1); setView({ y: d.getFullYear(), m: d.getMonth() }); };
  const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return (
    <div className="select-none" role="group" aria-label={`Choose a date, ${label}`}>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5 disabled:opacity-25">‹</button>
        <p className="font-display text-base font-bold">{label}</p>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-ink/65">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <span key={d} className="py-1">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: blanks }).map((_, i) => <span key={"b" + i} />)}
        {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
          const iso = toISO(new Date(view.y, view.m, day));
          const off = iso < min, sel = iso === value;
          return <button key={day} type="button" disabled={off} onClick={() => onChange(iso)} aria-pressed={sel} aria-label={prettyDate(iso)}
            className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition ${sel ? "bg-ink text-white" : off ? "text-ink/25" : "hover:bg-gold-500/30"}`}>{day}</button>;
        })}
      </div>
    </div>
  );
}
