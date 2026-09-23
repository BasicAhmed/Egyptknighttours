import type { Metadata } from "next";
import Link from "next/link";
import { loadReviewPage } from "@/lib/review-page";
import ReviewForm from "@/components/ReviewForm";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share your experience", robots: { index: false, follow: false, nocache: true } };

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const { ref } = await params; const { t } = await searchParams;
  const r = await loadReviewPage(ref, t);
  if (r.state === "invalid") return <div className="container-x max-w-xl py-20 text-center"><h1 className="h2">That link isn't valid</h1><p className="mt-2 text-ink/70">Please use the link from your email, or contact us if you need help.</p></div>;
  if (r.state === "not_completed") return <div className="container-x max-w-xl py-20 text-center"><h1 className="h2">Not quite yet</h1><p className="mt-2 text-ink/70">This page unlocks once your trip is marked complete. Check back after your trip!</p></div>;
  const d = r.data;
  return (
    <div className="container-x max-w-xl space-y-5 py-10">
      <header className="rounded-2xl bg-ink p-6 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-gold-500">{d.company.name}</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight sm:text-3xl">Thank you, {d.firstName}!</h1>
        <p className="mt-2 text-white/80">We hope {d.tourTitle} was everything you hoped for. Sharing your experience helps other travelers find us — and unlocks a reward for you.</p>
      </header>
      <ReviewForm bookingRef={d.ref} token={t ?? ""} links={d.links} code={d.code} friendDiscount={d.friendDiscount} />
      {d.code && (d.referralCount > 0 || d.balance > 0) && <div className="rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink/70">
        {d.referralCount > 0 && <p>{d.referralCount} booking{d.referralCount === 1 ? "" : "s"} so far from friends who used your code.</p>}
        {d.balance > 0 && <p className="mt-1">Your reward balance: <b className="text-ink">{d.balance}</b>. Mention it next time you book with us.</p>}
      </div>}
      <p className="text-center text-xs text-ink/65">Questions? <Link href="/contact" className="underline">Contact us</Link></p>
    </div>
  );
}
