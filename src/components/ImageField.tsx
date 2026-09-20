"use client";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/image-client";

// Upload a photo from your phone or computer. Works inside normal forms (hidden input) or with onChange.
export default function ImageField({ label, name, value, onChange, hint, compact = false }: { label: string; name?: string; value?: string | null; onChange?: (url: string) => void; hint?: string; compact?: boolean }) {
  const [url, setUrl] = useState(value ?? ""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const set = (u: string) => { setUrl(u); onChange?.(u); };
  async function pick(f: File) {
    setErr(""); setBusy(true);
    try {
      const small = await compressImage(f, 2000, 0.85);
      if (small.size > 4_000_000) { setErr("That photo is too big. Try a smaller one."); return; }
      const fd = new FormData(); fd.set("file", small);
      const r = await fetch("/api/admin/media", { method: "POST", body: fd }); const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) set(j.url); else setErr(j.error ?? "Upload failed. Try again.");
    } catch { setErr("Upload failed. Check your connection."); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return (
    <div className="min-w-0">
      <p className="label">{label}</p>
      <div className={`flex items-center gap-3 rounded-xl border border-ink/15 bg-white p-2.5 ${compact ? "" : "sm:p-3"}`}>
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink/[.06] ${compact ? "h-14 w-20" : "h-20 w-28"}`}>
          {url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url.startsWith("/api/media/") ? `${url}?w=480` : url} alt="" className="h-full w-full object-cover" /> : <span className="px-2 text-center text-[11px] font-semibold text-ink/65">No photo</span>}
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn btn-primary !min-h-[40px] !py-2 !px-3.5 !text-[14px]">{busy ? "Uploading…" : url ? "Replace photo" : "Upload photo"}</button>
          {url && !busy && <button type="button" onClick={() => set("")} className="btn btn-outline !min-h-[40px] !py-2 !px-3.5 !text-[14px]">Remove</button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*" className="sr-only" aria-label={label} onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); }} />
        {name && <input type="hidden" name={name} value={url} />}
      </div>
      {hint && !err && <p className="mt-1 text-xs text-ink/65">{hint}</p>}
      {err && <p role="alert" className="mt-1 text-sm font-semibold text-red-700">{err}</p>}
    </div>
  );
}
