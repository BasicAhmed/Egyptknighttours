import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { normalizeRef, signRef } from "@/lib/booking-token";
import { rateLimit, clientIp } from "@/lib/rate-limit";
export const metadata: Metadata = { title: "Track your booking", description: "Look up your Egypt Knight booking with your booking ID and email.", robots: { index: false, follow: true } };

async function lookup(fd: FormData) {
  "use server";
  if (!rateLimit("lookup:" + clientIp(await headers()), 10, 10 * 60_000)) redirect("/track?e=rate");
  const raw = String(fd.get("ref") ?? ""); const ref = normalizeRef(raw); const email = String(fd.get("email") ?? "").trim().toLowerCase();
  let ok = false;
  if (ref && email) {
    const [row] = await db.select({ email: s.customers.email }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.bookings.ref, ref));
    ok = !!row && row.email.toLowerCase() === email;
  }
  if (!ok || !ref) redirect(`/track?e=nf&ref=${encodeURIComponent(raw.slice(0, 20))}`);
  redirect(`/track/${ref}?t=${signRef(ref)}`);
}
export default async function Track({ searchParams }: { searchParams: Promise<{ e?: string; ref?: string }> }) {
  const { e, ref } = await searchParams;
  return (
    <div className="container-x max-w-lg py-14">
      <p className="eyebrow">Booking tracker</p><h1 className="h1 mt-2 !text-4xl">Track your booking</h1>
      <p className="mt-2 text-ink/70">Enter your booking ID and the email you booked with.</p>
      <form action={lookup} className="mt-6 space-y-4 rounded-2xl border border-ink/15 p-5">
        <div><label className="label" htmlFor="ref">Booking ID</label><input id="ref" name="ref" required defaultValue={ref ?? ""} placeholder="EK-ABC234" autoCapitalize="characters" className="input uppercase tracking-wider" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        {e && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{e === "rate" ? "Too many attempts. Please wait a few minutes." : "We couldn't find a booking with those details. Check the ID and email and try again."}</p>}
        <button className="btn btn-primary w-full">Find my booking</button>
      </form>
    </div>
  );
}
