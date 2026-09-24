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
        <div className="stat-card"><p className="stat-label">Reviews completed</p><p className="stat-value">{r.reviewsCompleted}</p></div>
        <div className="stat-card"><p className="stat-label">Waiting on a review</p><p className="stat-value">{r.reviewsPending}</p></div>
        <div className="stat-card"><p className="stat-label">Codes generated</p><p className="stat-value">{r.codesGenerated}</p></div>
        <div className="stat-card"><p className="stat-label">Bookings from a code</p><p className="stat-value">{r.referredBookings}</p></div>
        <div className="stat-card"><p className="stat-label">Discounts given</p><p className="stat-value">${r.discountsGiven}</p></div>
        <div className="stat-card"><p className="stat-label">Rewards paid out</p><p className="stat-value">${r.rewardsPaid}</p></div>
      </div>
      <div className="mt-3 stat-card"><p className="stat-label">Returning referrers</p><p className="stat-value">{r.returningReferrers}</p><p className="mt-1 text-xs text-ink/65">Customers who referred a friend and also came back to book with you again.</p></div>

      <h2 className="mt-8 font-display text-xl font-extrabold">Codes</h2>
      <div className="mt-2 card overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Codes table">
        <table className="table-modern min-w-[520px]">
          <thead><tr>
            <th>Code</th><th>Owner</th><th className="text-right">Bookings</th><th className="text-right">Revenue</th><th className="text-right">Rewards paid</th><th>Status</th><th><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>{r.codes.map((c) => (
            <tr key={c.code}>
              <td className="font-mono font-semibold">{c.code}</td><td>{c.owner}</td>
              <td className="text-right">{c.uses}</td><td className="text-right">${c.revenue}</td><td className="text-right">${c.rewardsPaid}</td>
              <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.active ? "bg-[#DFF3E6] text-[#17663A]" : "bg-ink/10 text-ink/60"}`}>{c.active ? "Active" : "Deactivated"}</span></td>
              <td><form action={toggleReferralCode.bind(null, c.id, !c.active)}><button className="text-sm font-semibold underline">{c.active ? "Deactivate" : "Reactivate"}</button></form></td>
            </tr>
          ))}</tbody>
        </table>
        {!r.codes.length && <p className="p-6 text-center text-sm text-ink/65">No codes yet — they're created the moment a customer completes their post-trip review.</p>}
      </div>

      <h2 className="mt-8 font-display text-xl font-extrabold">Review status</h2>
      <div className="mt-2 card overflow-x-auto p-0" tabIndex={0} role="region" aria-label="Review status table">
        <table className="table-modern min-w-[560px]">
          <thead><tr>
            <th>Customer</th><th>Trip</th><th>Status</th><th>Where</th><th>Code</th>
          </tr></thead>
          <tbody>{r.reviews.map((x) => (
            <tr key={x.ref}>
              <td className="font-semibold">{x.customer}</td><td>{x.tour}</td>
              <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${x.status === "COMPLETED" ? "bg-[#DFF3E6] text-[#17663A]" : "bg-gold-500/20 text-[#8A5A0A]"}`}>{x.status === "COMPLETED" ? "Reviewed" : "Waiting"}</span></td>
              <td className="text-ink/65">{x.platforms.join(", ") || "—"}</td><td className="font-mono">{x.code ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!r.reviews.length && <p className="p-6 text-center text-sm text-ink/65">No completed trips yet. This fills in automatically as bookings are marked Completed.</p>}
      </div>
    </div>
  );
}
