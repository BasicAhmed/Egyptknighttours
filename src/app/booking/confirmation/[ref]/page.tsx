import type { Metadata } from "next";
import Link from "next/link";
import { loadBooking } from "@/lib/booking-view";
import { verifyRef } from "@/lib/booking-token";
import BookingView from "@/components/BookingView";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking received", robots: { index: false, follow: false } };
export default async function Confirmation({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const { ref } = await params; const { t } = await searchParams;
  const data = verifyRef(ref, t) ? await loadBooking(ref) : null;
  if (!data || !t) return <div className="container-x max-w-xl py-20 text-center"><h1 className="h2">We couldn't open that booking</h1><p className="mt-2 text-ink/70">Use your booking ID and email to look it up.</p><Link href="/track" className="btn btn-primary mt-5">Track a booking</Link></div>;
  return <BookingView data={data} token={t} mode="confirmation" />;
}
