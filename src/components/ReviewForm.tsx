"use client";
import { useState } from "react";
import { submitReview } from "@/app/review/actions";
import CopyButton from "./CopyButton";
import { waLink } from "@/lib/format";

const PLATFORM_LABEL: Record<string, string> = { google: "Google", tripadvisor: "Tripadvisor", facebook: "Facebook", instagram: "Instagram", other: "Somewhere else" };

export default function ReviewForm({ bookingRef, token, links, code: initialCode, friendDiscount }: { bookingRef: string; token: string; links: { key: string; label: string; url: string }[]; code: string | null; friendDiscount: string }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  if (code) {
    const shareText = `I just had an amazing trip! Use my code ${code} for ${friendDiscount}: `;
    return (
      <div className="rounded-2xl border-2 border-gold-600 bg-gold-500/15 p-5 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-[#8A5A0A]">Thank you!</p>
        <p className="mt-1 font-display text-3xl font-extrabold">{code}</p>
        <p className="mt-2 text-sm text-ink/70">Your code. Share it and friends get {friendDiscount} — and you earn a reward every time someone books with it.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <a className="btn btn-wa !min-h-[46px]" href={waLink(shareText)} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
          <CopyButton text={code} label="Copy code" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {links.length > 0 && <div><p className="label">Leave a review</p>
        <div className="mt-2 flex flex-wrap gap-2">{links.map((l) => <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-[46px]">Review us on {l.label}</a>)}</div>
      </div>}
      <div><p className="label">Once you've posted it, tell us where</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Where did you leave a review">
          {Object.entries(PLATFORM_LABEL).map(([k, l]) => <button key={k} type="button" aria-pressed={picked.includes(k)} onClick={() => toggle(k)} className={`btn !min-h-[42px] !py-2 !text-[14px] ${picked.includes(k) ? "btn-dark" : "btn-outline"}`}>{l}</button>)}
        </div>
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}
      <button disabled={busy} className="btn btn-primary w-full !min-h-[48px]" onClick={async () => {
        setBusy(true); setErr("");
        const r = await submitReview(bookingRef, token, picked);
        if (r.ok) setCode(r.code ?? null); else setErr(r.message ?? "Something went wrong.");
        setBusy(false);
      }}>{busy ? "Saving…" : "I've left my review — unlock my code"}</button>
    </div>
  );
}
