import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { money, waLink } from "@/lib/format";
import WhatsAppButton from "@/components/WhatsAppButton";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking received", robots: { index: false, follow: false } };
export default async function Confirmation({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [b] = await db.select({ b: s.bookings, tour: s.tours.title }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.ref, ref));
  if (!b) notFound();
  const x = b.b;
  return <div className="container-x max-w-2xl py-12"><div className="card p-6">
    <p className="badge">Booking received</p><h1 className="h1 mt-3 !text-3xl">You're booked in, thank you.</h1>
    <p className="mt-2 text-ink/70">Reference <b className="text-ink">{x.ref}</b>. Save it in case you need to reach us.</p>
    <dl className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><dt>Tour</dt><dd className="text-right font-semibold">{b.tour}</dd></div><div className="flex justify-between"><dt>Date</dt><dd>{x.travelDate}</dd></div>
      <div className="flex justify-between"><dt>Travellers</dt><dd>{x.adults} adults{x.children ? `, ${x.children} children` : ""}{x.infants ? `, ${x.infants} infants` : ""}</dd></div><div className="flex justify-between"><dt>Total</dt><dd className="font-semibold">{money(x.total)}</dd></div>
      <div className="flex justify-between"><dt>{x.payMode === "PAY_LATER" ? "Due today" : "Deposit / payment due"}</dt><dd>{money(x.deposit)}</dd></div></dl>
    <div className="mt-5 rounded-xl bg-gold-500/15 p-4 text-sm"><p className="font-semibold">What happens next</p><p className="text-ink/80">We'll confirm availability and send a secure payment link by WhatsApp and email. Your booking is held while we do.</p></div>
    <WhatsAppButton href={waLink(`Hi Egypt Knight, my booking reference is ${x.ref}.`)} label="Message us on WhatsApp" className="btn btn-wa mt-5 w-full" /></div></div>;
}
