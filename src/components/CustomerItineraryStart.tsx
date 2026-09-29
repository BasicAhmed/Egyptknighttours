"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Booking = { id: string; ref: string; name: string; date: string; blocked: boolean };
// "For a customer" starter: blank, a template, or import an existing itinerary PDF — all three linked to the chosen order.
export default function CustomerItineraryStart({ bookings, templates, defaultBookingId, action }: { bookings: Booking[]; templates: { id: string; name: string }[]; defaultBookingId: string; action: (fd: FormData) => void | Promise<void> }) {
  const router = useRouter(); const file = useRef<HTMLInputElement>(null);
  const [bookingId, setBookingId] = useState(defaultBookingId); const [start, setStart] = useState("");
  const [up, setUp] = useState<{ busy: boolean; err?: string }>({ busy: false });
  const pdf = start === "__pdf";
  async function importPdf(f: File | undefined) {
    if (!f || !bookingId) return; setUp({ busy: true });
    try {
      const fd = new FormData(); fd.set("file", f); fd.set("bookingId", bookingId);
      const r = await fetch("/api/admin/itineraries/import", { method: "POST", body: fd }); const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { router.push(`/admin/itineraries/${j.id}`); return; }
      setUp({ busy: false, err: j.error ?? (r.status === 413 ? "File is too large (4 MB limit)." : "Import failed. Try again.") });
    } catch { setUp({ busy: false, err: "Upload failed. Check your connection." }); }
    if (file.current) file.current.value = "";
  }
  return (
    <form action={action} className="grid gap-3" onSubmit={(e) => { if (pdf) { e.preventDefault(); if (bookingId) file.current?.click(); } }}>
      <input type="hidden" name="kind" value="customer" />
      <div><label className="label" htmlFor="c-booking">Choose the order</label>
        <select id="c-booking" name="bookingId" required value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="input">
          <option value="" disabled>Search by name or booking ID…</option>
          {bookings.map((b) => <option key={b.id} value={b.id} disabled={b.blocked}>{b.ref} · {b.name} · {b.date}{b.blocked ? " (already has an itinerary)" : ""}</option>)}
        </select>
      </div>
      <div><label className="label" htmlFor="c-template">Start from</label>
        <select id="c-template" name="templateId" value={start} onChange={(e) => { setStart(e.target.value); setUp({ busy: false }); }} className="input">
          <option value="">Blank, start from scratch</option><option value="__pdf">Import from PDF</option>
          {templates.length > 0 && <optgroup label="Templates">{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
        </select>
      </div>
      {pdf && <p className="text-xs text-ink/65">Text PDFs up to 4 MB. Days, included list and price are read from the file; the customer&apos;s name, travelers and dates come from the order.</p>}
      <button disabled={up.busy} className="btn btn-primary !min-h-[46px]">{pdf ? (up.busy ? "Importing…" : "Choose PDF and import") : "Create for this customer"}</button>
      <input ref={file} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Itinerary PDF" onChange={(e) => void importPdf(e.target.files?.[0])} />
      {up.err && <p role="alert" className="text-sm font-medium text-red-800">{up.err}</p>}
    </form>
  );
}
