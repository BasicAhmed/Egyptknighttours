import Link from "next/link";
import SiteImage from "./SiteImage";
import CopyButton from "./CopyButton";
import PrintButton from "./PrintButton";
import WhatsAppButton from "./WhatsAppButton";
import { money, waLink } from "@/lib/format";
import { MILESTONES, currentMilestone, type LoadedBooking } from "@/lib/booking-view";

const nice = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const NEXT: Record<string, string> = {
  PENDING: "We're checking availability for your date. You'll hear from us on WhatsApp or email to confirm.",
  CONFIRMED: "Your booking is confirmed. We'll send a secure payment link if a payment is still due.",
  DEPOSIT_PAID: "Your deposit is in. The balance is due before your trip and we'll remind you.",
  PAID: "You're all paid up. We'll send pickup details the day before your trip.",
  COMPLETED: "We hope you had an amazing trip. Thank you for traveling with Egypt Knight.",
  CANCELLED: "This booking was cancelled. Message us if this is a mistake or you'd like to rebook.",
};

export default function BookingView({ data, token, mode }: { data: LoadedBooking; token: string; mode: "confirmation" | "track" }) {
  const { b, tour, dest, c } = data;
  const cur = currentMilestone(b.status);
  const first = c.name.split(" ")[0];
  const when = (types: readonly string[]) => { const e = data.events.find((x) => types.includes(x.type)); return e ? short(e.createdAt) : null; };
  const wa = waLink(`Hi Egypt Knight, my booking reference is ${b.ref}${mode === "track" ? "" : ""}. `);
  const people = `${b.adults} adult${b.adults > 1 ? "s" : ""}${b.children ? `, ${b.children} child${b.children > 1 ? "ren" : ""}` : ""}${b.infants ? `, ${b.infants} infant${b.infants > 1 ? "s" : ""}` : ""}`;
  return (
    <div className="container-x max-w-4xl py-10 print:py-0">
      {mode === "confirmation" ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#141010" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
          <h1 className="h1 mt-5 !text-4xl">Thank you, {first}!</h1>
          <p className="mx-auto mt-2 max-w-xl text-lg text-ink/70">Your booking request is in. We'll confirm it by WhatsApp and email.</p>
        </div>
      ) : (<div><p className="eyebrow">Booking tracker</p><h1 className="h1 mt-2 !text-4xl">Hi {first}, here's your booking</h1></div>)}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-gold-600 bg-gold-500/10 p-5">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Your booking ID</p><p className="font-display text-3xl font-extrabold tracking-wider">{b.ref}</p></div>
        <div className="flex flex-wrap gap-2 print:hidden"><CopyButton text={b.ref} label="Copy ID" />{mode === "confirmation" && <Link href={`/track/${b.ref}?t=${token}`} className="btn btn-dark !min-h-[40px] !py-2">Track booking</Link>}</div>
      </div>
      {mode === "confirmation" && <p className="mt-2 text-sm text-ink/60">Keep this ID. You can track your booking any time at <b>/track</b> with your ID and email.</p>}

      {cur === -1 ? <div className="mt-8 rounded-2xl bg-red-50 p-5 font-semibold text-red-800">This booking was cancelled.</div> : (
        <ol className="mt-8 grid gap-4 sm:grid-cols-5" aria-label="Booking status">
          {MILESTONES.map((m, i) => { const done = i < cur || (i === cur && cur === 4), now = i === cur && cur !== 4; const date = when(m.types); return (
            <li key={m.key} className="relative">
              <span className={`block h-1.5 rounded-full ${done ? "bg-gold-500" : now ? "bg-ink" : "bg-ink/10"}`} />
              <p className={`mt-2 text-sm font-semibold ${done || now ? "text-ink" : "text-ink/40"}`}>{m.label}</p>
              <p className="text-xs text-ink/50">{date ?? (now ? "In progress" : "")}</p></li>); })}
        </ol>)}
      <p className="mt-5 rounded-xl bg-ink/[.04] p-4 text-[15px] text-ink/80"><b>What's next: </b>{NEXT[b.status] ?? NEXT.PENDING}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-ink/15 p-5">
          <div className="flex gap-4"><SiteImage src={tour.imageUrl} alt="" destination={dest.slug} className="relative h-24 w-32 shrink-0 rounded-xl" />
            <div><Link href={`/tours/${tour.slug}`} className="font-display text-xl font-bold hover:underline">{tour.title}</Link><p className="text-sm text-ink/60">{dest.name}</p></div></div>
          <dl className="mt-5 space-y-3 text-sm">
            {([["Date", nice(b.travelDate)], ["Travelers", people], ["Style", b.isPrivate ? "Private" : "Shared"], ["Pickup", b.hotel ? `${b.hotel}${b.pickupLocation ? ` (${b.pickupLocation})` : ""}` : "To be confirmed"], ["Meeting point", tour.meetingPoint || "We'll message you"], ["Extras", data.addons.length ? data.addons.map((a) => a.name).join(", ") : "None"]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6"><dt className="text-ink/55">{k}</dt><dd className="text-right font-medium">{v}</dd></div>))}
            {b.specialRequests && <div className="flex justify-between gap-6"><dt className="text-ink/55">Requests</dt><dd className="max-w-[60%] whitespace-pre-line text-right font-medium">{b.specialRequests}</dd></div>}
          </dl>
        </section>
        <section className="rounded-2xl border border-ink/15 p-5 text-sm">
          <h2 className="font-display text-lg font-bold">Payment</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between"><dt className="text-ink/55">Subtotal</dt><dd>{money(b.subtotal)}</dd></div>
            {b.discount > 0 && <div className="flex justify-between"><dt className="text-ink/55">Discount</dt><dd className="text-[#1a7f45]">−{money(b.discount)}</dd></div>}
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold"><dt>Total</dt><dd>{money(b.total)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/55">Paid so far</dt><dd>{money(data.paid)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Still to pay</dt><dd>{money(data.due)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-ink/55">{b.payMode === "PAY_LATER" ? "You chose to pay later." : b.payMode === "FULL" ? "You chose to pay in full." : `You chose a 30% deposit (${money(b.deposit)}).`} We'll send a secure payment link.</p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <WhatsAppButton href={wa} label="Message us about this booking" />
        <a href={`/api/booking/${b.ref}/ics?t=${token}`} className="btn btn-outline">Add to calendar</a>
        <PrintButton />
        <Link href="/tours" className="btn btn-outline">Explore more tours</Link>
      </div>
      {mode === "confirmation" && <p className="mt-6 text-xs text-ink/50 print:hidden">A confirmation email is not sent automatically yet. Save this page or your booking ID.</p>}
    </div>
  );
}
