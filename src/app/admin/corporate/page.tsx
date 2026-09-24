import Link from "next/link";
import { requireStaff, PERMS } from "@/lib/auth";
import { listCorporateRequests } from "@/lib/corporate";
import CorporateBoard from "@/components/CorporateBoard";
import Notice from "@/components/Notice";
export const dynamic = "force-dynamic";

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
      <CorporateBoard rows={rows} canFinance={canFinance} />
    </div>
  );
}
