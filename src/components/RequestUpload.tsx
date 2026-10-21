"use client";
// One upload on the customer's booking page: a passport for one traveler, a payment receipt, or a requested file.
// Big phone photos are made smaller first so they fit; the server checks everything again (api/booking/[ref]/upload).
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/image-client";
import { MAX_UPLOAD_BYTES } from "@/lib/customer-uploads";

type Props = { bookingRef: string; token: string; requestId: string; travelerId?: string; kind: "PASSPORT" | "PAYMENT_PROOF" | "FILE"; label: string; again?: boolean; currency?: string };
export default function RequestUpload({ bookingRef, token, requestId, travelerId, kind, label, again, currency }: Props) {
  const router = useRouter(); const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [amount, setAmount] = useState("");
  const send = async (picked: File) => {
    setBusy(true); setMsg(null);
    try {
      const file = await compressImage(picked);
      if (file.size > MAX_UPLOAD_BYTES) { setMsg({ ok: false, t: `That file is ${(file.size / 1e6).toFixed(1)} MB. Please send one under 4 MB, or take a photo instead.` }); return; }
      const fd = new FormData(); fd.append("file", file); fd.append("requestId", requestId);
      if (travelerId) fd.append("travelerId", travelerId); if (kind === "PAYMENT_PROOF" && amount) fd.append("amount", amount);
      const r = await fetch(`/api/booking/${encodeURIComponent(bookingRef)}/upload?t=${encodeURIComponent(token)}`, { method: "POST", body: fd });
      const j = await r.json().catch(() => ({ ok: false, error: "Something went wrong. Please try again." }));
      setMsg({ ok: !!j.ok, t: j.ok ? j.message : j.error }); if (j.ok) router.refresh();
    } catch { setMsg({ ok: false, t: "The upload didn't go through. Check your connection and try again." }); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return (
    <div className="mt-2">
      {kind === "PAYMENT_PROOF" && <label className="mb-2 block max-w-[220px]"><span className="text-sm font-semibold">Amount you paid{currency ? ` (${currency})` : ""}</span>
        <input type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="input mt-1 !py-2" placeholder="Optional" /></label>}
      <input ref={input} type="file" accept="image/*,application/pdf" className="sr-only" id={`up-${requestId}-${travelerId ?? ""}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void send(f); }} disabled={busy} />
      <label htmlFor={`up-${requestId}-${travelerId ?? ""}`} className={`btn ${again ? "btn-dark" : "btn-primary"} !min-h-[48px] cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? "Uploading…" : again ? `Upload ${label} again` : `Upload ${label}`}
      </label>
      <p className="mt-1 text-xs text-ink/60">A photo or a PDF, up to 4 MB. Sent securely; only our team can see it.</p>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm font-semibold ${msg.ok ? "text-[#17663A]" : "text-red-700"}`}>{msg.t}</p>}
    </div>
  );
}
