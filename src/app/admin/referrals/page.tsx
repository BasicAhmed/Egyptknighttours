import { requireStaff } from "@/lib/auth";
import { referralOverview } from "@/lib/referral-report";
import { toggleReferralCode } from "../doc-actions";
import Notice from "@/components/Notice";
export const dynamic = "force-dynamic";

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ n?: string; e?: string }> }) {
  await requireStaff("referrals"); const sp = await searchParams;
  const r = await referralOverview();
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Referrals & reviews</h1>
      <p className="text-sm text-ink/65">Who reviewed their trip, the codes it unlocked, and what the program has earned and paid out.</p>
      <div className="mt-3"><Notice n={sp.n} e={sp.e} /></div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="label">Reviews completed</p><p className="mt-1 text-lg font-bold">{r.reviewsCompleted}</p></div>
        <div className="card p-4"><p className="label">Waiting on a review</p><p className="mt-1 text-lg font-bold">{r.reviewsPending}</p></div>
        <div className="card p-4"><p className="label">Codes generated</p><p className="mt-1 text-lg font-bold">{r.codesGenerated}</p></div>
        <div className="card p-4"><p className="label">Bookings from a code</p><p className="mt-1 text-lg font-bold">{r.referredBookings}</p></div>
        <div className="card p-4"><p className="label">Discounts given</p><p className="mt-1 text-lg font-bold">${r.discountsGiven}</p></div>
        <div className="card p-4"><p className="label">Rewards paid out</p><p className="mt-1 text-lg font-bold">${r.rewardsPaid}</p></div>
      </div>
      <div className="mt-3 card p-4"><p className="label">Returning referrers</p><p className="mt-1 text-lg font-bold">{r.returningReferrers}</p><p className="text-xs text-ink/65">Customers who referred a friend and also came back to book with you again.</p></div>

      <h2 className="mt-8 font-display text-xl font-extrabold">Codes</h2>
      <div className="mt-2 card overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Codes table">
        <table className="w-full min-w-[520px] text-sm">
          <thead><tr className="border-b border-ink/10 text-left text-xs font-bold uppercase tracking-wide text-ink/65">
            <th className="px-4 py-3">Code</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3 text-right">Bookings</th><th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3 text-right">Rewards paid</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>{r.codes.map((c) => (
            <tr key={c.code} className="border-b border-ink/5 last:border-0">
              <td className="px-4 py-3 font-mono font-semibold">{c.code}</td><td className="px-4 py-3">{c.owner}</td>
              <td className="px-4 py-3 text-right">{c.uses}</td><td className="px-4 py-3 text-right">${c.revenue}</td><td className="px-4 py-3 text-right">${c.rewardsPaid}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.active ? "bg-[#DFF3E6] text-[#17663A]" : "bg-ink/10 text-ink/60"}`}>{c.active ? "Active" : "Deactivated"}</span></td>
              <td className="px-4 py-3"><form action={toggleReferralCode.bind(null, c.id, !c.active)}><button className="text-sm font-semibold underline">{c.active ? "Deactivate" : "Reactivate"}</button></form></td>
            </tr>
          ))}</tbody>
        </table>
        {!r.codes.length && <p className="p-6 text-center text-sm text-ink/65">No codes yet — they're created the moment a customer completes their post-trip review.</p>}
      </div>

      <h2 className="mt-8 font-display text-xl font-extrabold">Review status</h2>
      <div className="mt-2 card overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Review status table">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-ink/10 text-left text-xs font-bold uppercase tracking-wide text-ink/65">
            <th className="px-4 py-3">Customer</th><th className="px-4 py-3">Trip</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Where</th><th className="px-4 py-3">Code</th>
          </tr></thead>
          <tbody>{r.reviews.map((x) => (
            <tr key={x.ref} className="border-b border-ink/5 last:border-0">
              <td className="px-4 py-3 font-semibold">{x.customer}</td><td className="px-4 py-3">{x.tour}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${x.status === "COMPLETED" ? "bg-[#DFF3E6] text-[#17663A]" : "bg-gold-500/20 text-[#8A5A0A]"}`}>{x.status === "COMPLETED" ? "Reviewed" : "Waiting"}</span></td>
              <td className="px-4 py-3 text-ink/65">{x.platforms.join(", ") || "—"}</td><td className="px-4 py-3 font-mono">{x.code ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!r.reviews.length && <p className="p-6 text-center text-sm text-ink/65">No completed trips yet. This fills in automatically as bookings are marked Completed.</p>}
      </div>
    </div>
  );
}
