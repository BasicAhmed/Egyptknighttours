"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item = { name: string; state: "wait" | "busy" | "ok" | "err"; msg?: string; id?: string; warnings?: string[]; isTemplate?: boolean };
export default function PdfImport({ defaultTemplate }: { defaultTemplate: boolean }) {
  const router = useRouter(); const input = useRef<HTMLInputElement>(null);
  const [asTemplate, setAsTemplate] = useState(defaultTemplate); const [items, setItems] = useState<Item[]>([]); const [busy, setBusy] = useState(false); const [drag, setDrag] = useState(false);
  const patch = (i: number, p: Partial<Item>) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x)));

  async function run(files: File[]) {
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    if (!pdfs.length) return;
    setBusy(true); setItems(pdfs.map((f) => ({ name: f.name, state: "wait" as const })));
    for (let i = 0; i < pdfs.length; i++) {
      patch(i, { state: "busy" });
      try {
        const fd = new FormData(); fd.set("file", pdfs[i]); fd.set("asTemplate", asTemplate ? "1" : "0");
        const r = await fetch("/api/admin/itineraries/import", { method: "POST", body: fd }); const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) patch(i, { state: "ok", id: j.id, isTemplate: j.isTemplate, msg: `${j.report.days} days, ${j.report.blocks} timeline items, ${j.report.included} included${j.report.hasPrice ? ", price found" : ""}`, warnings: j.report.warnings });
        else patch(i, { state: "err", msg: j.error ?? (r.status === 413 ? "File is too large (4 MB limit)." : "Import failed. Try again.") });
      } catch { patch(i, { state: "err", msg: "Upload failed. Check your connection." }); }
    }
    setBusy(false); router.refresh(); if (input.current) input.current.value = "";
  }
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-4" aria-labelledby="imp-h">
      <h2 id="imp-h" className="font-display text-lg font-extrabold">Import from PDF</h2>
      <p className="text-sm text-ink/65">Upload itineraries you already have. Each one becomes an editable itinerary with the days, headlines, included list and price filled in.</p>
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void run([...e.dataTransfer.files]); }}
        className={`mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center ${drag ? "border-ink bg-gold-500/20" : "border-ink/25 bg-ink/[.02]"}`}>
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn btn-primary !min-h-[46px]">{busy ? "Importing…" : "Choose PDF files"}</button>
        <p className="mt-2 text-xs text-ink/65">You can select several at once. Up to 4 MB each. Text PDFs only (not scans).</p>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="sr-only" aria-label="PDF files" onChange={(e) => void run([...(e.target.files ?? [])])} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-black" checked={asTemplate} onChange={(e) => setAsTemplate(e.target.checked)} disabled={busy} />Save as templates (so you can reuse them for any customer)</label>
      {items.length > 0 && <ul className="mt-4 space-y-2" aria-live="polite">{items.map((x, i) => (
        <li key={i} className={`rounded-xl border p-3 text-sm ${x.state === "err" ? "border-red-200 bg-red-50" : x.state === "ok" ? "border-[#BFE3CC] bg-[#F1FAF4]" : "border-ink/10"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="min-w-0 truncate font-semibold">{x.name}</span>
            {x.state === "busy" && <span className="text-ink/65">Reading…</span>}{x.state === "wait" && <span className="text-ink/65">Waiting</span>}
            {x.state === "ok" && x.id && <Link className="btn btn-dark !min-h-[36px] !py-1 !px-3 !text-[13px]" href={`/admin/itineraries/${x.id}`}>Review and edit</Link>}</div>
          {x.msg && <p className={x.state === "err" ? "mt-1 font-medium text-red-800" : "mt-1 text-[#17663A]"}>{x.state === "ok" ? `Imported: ${x.msg}` : x.msg}</p>}
          {x.warnings?.map((w) => <p key={w} className="mt-1 text-[#7A4B00]">⚠ {w}</p>)}</li>))}</ul>}
    </section>
  );
}
