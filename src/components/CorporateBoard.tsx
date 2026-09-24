"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { REQUEST_STATUS, REQUEST_STATUS_LABEL } from "@/lib/corporate-constants";

const STATUS_TONE: Record<string, string> = {
  NEW: "bg-gold-500/20 text-[#8A5A0A]", CONFIRMED: "bg-[#DFF3E6] text-[#17663A]", IN_PROGRESS: "bg-[#2A5C8A]/10 text-[#2A5C8A]",
  COMPLETED: "bg-ink/10 text-ink/70", CANCELLED: "bg-red-50 text-red-700",
};
export type CorpRow = { id: string; ref: string; companyName: string; customerName: string; serviceDate: string | null; status: string; serviceCount: number; price: number; paid: number; balance: number };

export default function CorporateBoard({ rows, canFinance }: { rows: CorpRow[]; canFinance: boolean }) {
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = status === "all" ? rows : rows.filter((r) => r.status === status);
    if (needle) out = out.filter((r) => `${r.ref} ${r.companyName} ${r.customerName}`.toLowerCase().includes(needle));
    return out;
  }, [rows, q, status]);

  return (
    <div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1"><svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/65" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <input aria-label="Search corporate requests" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, request ID, customer…" className="input !rounded-xl !bg-white !pl-11" /></div>
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Status filters">
        <button role="tab" aria-selected={status === "all"} onClick={() => setStatus("all")} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${status === "all" ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70 hover:border-ink/40"}`}>All {rows.length}</button>
        {REQUEST_STATUS.map((st) => { const n = rows.filter((r) => r.status === st).length; return (
          <button key={st} role="tab" aria-selected={status === st} onClick={() => setStatus(st)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${status === st ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70 hover:border-ink/40"}`}>{REQUEST_STATUS_LABEL[st]} {n}</button>
        ); })}
      </div>

      <ul className="mt-4 space-y-2.5">
        {list.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/corporate/${r.id}`} className="card card-hover grid gap-2 p-4 sm:grid-cols-[1.2fr_1.1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-display text-[17px] font-extrabold">{r.companyName}</p>
                <p className="truncate text-sm text-ink/65">{r.ref}{r.customerName ? ` · for ${r.customerName}` : ""}</p>
              </div>
              <div className="min-w-0 text-sm text-ink/70">
                <p>{r.serviceDate ? new Date(r.serviceDate + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No date set"}</p>
                <p className="text-ink/65">{r.serviceCount} service{r.serviceCount === 1 ? "" : "s"}{canFinance || r.price > 0 ? ` · $${r.paid} of $${r.price}` : ""}</p>
              </div>
              <span className={`justify-self-start rounded-full px-3 py-1 text-xs font-bold sm:justify-self-end ${STATUS_TONE[r.status] ?? "bg-ink/10 text-ink/70"}`}>{REQUEST_STATUS_LABEL[r.status] ?? r.status}</span>
            </Link>
          </li>
        ))}
        {!list.length && rows.length > 0 && <li className="card p-8 text-center text-sm text-ink/65">No requests match that search or filter.</li>}
        {!rows.length && <li className="card p-8 text-center text-sm text-ink/65">No corporate requests yet. Create one when a company or agency asks you to arrange services for their client.</li>}
      </ul>
    </div>
  );
}
