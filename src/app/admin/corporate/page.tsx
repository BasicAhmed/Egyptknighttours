import Link from "next/link";
import { requireStaff, PERMS } from "@/lib/auth";
import { listCorporateRequests, REQUEST_STATUS_LABEL } from "@/lib/corporate";
import Notice from "@/components/Notice";
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  NEW: "bg-gold-500/20 text-[#8A5A0A]", CONFIRMED: "bg-[#DFF3E6] text-[#17663A]", IN_PROGRESS: "bg-[#2A5C8A]/10 text-[#2A5C8A]",
  COMPLETED: "bg-ink/10 text-ink/70", CANCELLED: "bg-red-50 text-red-700",
};

export default async function CorporateList({ searchParams }: { searchParams: Promise<{ n?: string; e?: string }> }) {
  const u = await requireStaff("corporate"); const sp = await searchParams;
  const canFinance = PERMS.finance.includes(u.role);
  const rows = await listCorporateRequests();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Corporate requests</h1><p className="text-sm text-ink/65">Services arranged for other companies and travel agencies — separate from direct customer orders.</p></div>
        <Link href="/admin/corporate/new" className="btn btn-primary !min-h-[46px]">+ New request</Link>
      </div>
      <div className="mt-3"><Notice n={sp.n} e={sp.e} /></div>

      <ul className="mt-5 space-y-2.5">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/corporate/${r.id}`} className="card card-hover grid gap-2 p-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-display text-[17px] font-extrabold">{r.companyName}</p>
                <p className="truncate text-sm text-ink/65">{r.ref}{r.customerName ? ` · for ${r.customerName}` : ""}</p>
              </div>
              <div className="min-w-0 text-sm text-ink/70">
                <p>{r.serviceDate ? new Date(r.serviceDate + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No date set"}</p>
                <p className="text-ink/65">{r.serviceCount} service{r.serviceCount === 1 ? "" : "s"}{canFinance ? ` · $${r.price}` : ""}</p>
              </div>
              <span className={`justify-self-start rounded-full px-3 py-1 text-xs font-bold sm:justify-self-end ${STATUS_TONE[r.status] ?? "bg-ink/10 text-ink/70"}`}>{REQUEST_STATUS_LABEL[r.status] ?? r.status}</span>
            </Link>
          </li>
        ))}
        {!rows.length && <li className="card p-8 text-center text-sm text-ink/65">No corporate requests yet. Create one when a company or agency asks you to arrange services for their client.</li>}
      </ul>
    </div>
  );
}
