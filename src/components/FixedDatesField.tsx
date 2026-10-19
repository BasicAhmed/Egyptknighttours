"use client";
// Staff pick the days a tour runs on. Empty = customers can choose any future day. The list goes to the server as JSON
// in a hidden field and is checked there again (parseFixedDates in lib/tour-dates.ts).
import { useEffect, useState } from "react";
import { readFixedDates, isRealDay } from "@/lib/tour-dates";

const nice = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const todayUTC = () => new Date().toISOString().slice(0, 10);

export default function FixedDatesField({ name = "fixedDates", value }: { name?: string; value?: string | null }) {
  const [dates, setDates] = useState<string[]>(() => readFixedDates(value));
  const [pick, setPick] = useState("");
  // A refused save brings the page back with the dates that were being saved (FormKeeper).
  useEffect(() => { const on = (e: Event) => { const v = (e as CustomEvent<Record<string, string>>).detail?.[name]; if (v != null) setDates(readFixedDates(v)); }; window.addEventListener("fk-restore", on); return () => window.removeEventListener("fk-restore", on); }, [name]);
  const add = () => { if (!isRealDay(pick)) return; setDates((d) => [...new Set([...d, pick])].sort()); setPick(""); };
  const today = todayUTC(); const past = dates.filter((d) => d <= today);
  return (
    <fieldset className="rounded-xl border border-ink/15 p-4 sm:col-span-2">
      <legend className="label px-1">Fixed dates <span className="font-normal text-ink/65">(optional)</span></legend>
      <p className="text-sm text-ink/70">{dates.length ? "Customers can book this tour on these dates only." : "No fixed dates: customers can choose any future day. Add dates to allow only those."}</p>
      <input type="hidden" name={name} value={JSON.stringify(dates)} />
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div><label className="label" htmlFor={`${name}-pick`}>Add a date</label><input id={`${name}-pick`} type="date" min={today} value={pick} onChange={(e) => setPick(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} className="input !w-auto" /></div>
        <button type="button" onClick={add} disabled={!isRealDay(pick)} className="btn btn-dark !min-h-[46px] disabled:opacity-40">Add date</button>
      </div>
      {dates.length > 0 && <ul className="mt-3 flex flex-wrap gap-2" aria-label="Fixed dates">
        {dates.map((d) => (
          <li key={d} className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold ${d <= today ? "border-ink/10 bg-ink/5 text-ink/50 line-through" : "border-ink/20 bg-white"}`}>
            {nice(d)}<button type="button" onClick={() => setDates((x) => x.filter((y) => y !== d))} aria-label={`Remove ${nice(d)}`} className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-base leading-none hover:bg-ink/10">×</button>
          </li>))}
      </ul>}
      {past.length > 0 && <p className="mt-2 text-xs text-ink/65">{past.length} date{past.length === 1 ? " has" : "s have"} passed and can't be booked.{" "}<button type="button" onClick={() => setDates((x) => x.filter((y) => y > today))} className="font-semibold underline">Remove past dates</button></p>}
      {dates.length > 0 && !dates.some((d) => d > today) && <p className="mt-2 text-sm font-semibold text-red-700">Every date has passed: customers can't book this tour until you add a new date or remove them all.</p>}
    </fieldset>
  );
}
