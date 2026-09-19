"use client";
export default function Stepper({ label, sub, value, min, max, onChange }: { label: string; sub: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div><p className="text-[15px] font-semibold">{label}</p><p className="text-xs text-ink/55">{sub}</p></div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/25 text-xl hover:border-ink disabled:opacity-30" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span className="w-6 text-center text-base font-bold" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/25 text-xl hover:border-ink disabled:opacity-30" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}
