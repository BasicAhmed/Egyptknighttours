import Link from "next/link";
import SiteImage from "./SiteImage";
import CopyButton from "./CopyButton";
import PrintButton from "./PrintButton";
import WhatsAppButton from "./WhatsAppButton";
import RequestUpload from "./RequestUpload";
import { money, waLink } from "@/lib/format";
import { MILESTONES, currentMilestone, type LoadedBooking } from "@/lib/booking-view";
import { prepaidVia, resolvePickup, styleLabel } from "@/lib/order-rules";

const nice = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
// The newest invoice and the newest itinerary are what the customer needs; versions sent before are kept, folded away.
type Doc = LoadedBooking["docs"][number];
function latestDocs(docs: Doc[]) {
  const sorted = [...docs].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  const latest: Doc[] = []; const older: Doc[] = [];
  for (const d of sorted) (latest.some((x) => x.kind === d.kind) ? older : latest).push(d);
  return { latest, older };
}
// One true sentence under the payment box. (It used to say "You chose a 0% deposit ($0)" on orders made by our team.)
function paymentNote(b: LoadedBooking["b"], paid: number, due: number) {
  if (!(b.total > 0)) return "We'll confirm your price soon.";
  if (due <= 0) return "Paid in full. Thank you!";
  const website = !b.source || b.source === "WEBSITE";
  if (website && b.payMode === "DEPOSIT" && b.deposit > 0 && paid < b.deposit - 0.005) return `A ${money(b.deposit, b.currency)} deposit confirms your booking. We'll send you how to pay.`;
  if (website && b.payMode === "PAY_LATER" && paid <= 0) return "You chose to pay later. We'll send you how to pay before your trip.";
  return paid > 0 ? "Thank you for your payment. We'll send you how to pay the rest." : "We'll send you how to pay.";
}
const NEXT: Record<string, string> = {
  PENDING: "We're checking availability for your date. You'll hear from us on WhatsApp or email to confirm.",
  INVOICED: "We've sent your invoice. Complete your payment by the deadline to lock in your trip.",
  PARTIALLY_PAID: "We've received part of your payment. The remaining balance is shown below.",
  QUOTE_SENT: "We've sent you a quote. Reply to us whenever you're ready to go ahead.",
  ITINERARY_SENT: "We've sent you your itinerary. Have a look, tell us what you'd like to change, or reply when you're ready to go ahead.",
  INQUIRY: "We've received your inquiry and will be in touch shortly.",
  CONFIRMED: "Your booking is confirmed. We'll send a secure payment link if a payment is still due.",
  DEPOSIT_PAID: "Your deposit is in. The balance is due before your trip and we'll remind you.",
  PAID: "You're all paid up. We'll send pickup details the day before your trip.",
  COMPLETED: "We hope you had an amazing trip. Thank you for traveling with Egypt Knight.",
  CANCELLED: "This booking was cancelled. Message us if this is a mistake or you'd like to rebook.",
};

export default function BookingView({ data, token, mode }: { data: LoadedBooking; token: string; mode: "confirmation" | "track" }) {
  const { b, tour, dest, c } = data;
  const custom = tour.slug === "custom-experience"; // staff-entered custom orders sit on a placeholder tour: show the order's own title, no tour link or destination
  const cur = currentMilestone(b.status);
  const first = (b.guestName || c.name).split(" ")[0]; // this order's own guest name, so an edit in the admin shows here at once
  const when = (types: readonly string[]) => { const e = data.events.find((x) => types.includes(x.type)); return e ? short(e.createdAt) : null; };
  const wa = waLink(`Hi Egypt Knight, my booking reference is ${b.ref}${mode === "track" ? "" : ""}. `);
  // Pickup and meeting point as this order has them (its own text, else the tour's). Paid through a marketplace such as Viator:
  // the customer paid there, so this page shows no amounts and never asks for money.
  const pickup = resolvePickup(b, tour); const market = prepaidVia(b.source);
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
        <div><p className="text-xs font-semibold uppercase tracking-wide text-ink/65">Your booking ID</p><p className="font-display text-3xl font-extrabold tracking-wider">{b.ref}</p></div>
        <div className="flex flex-wrap gap-2 print:hidden"><CopyButton text={b.ref} label="Copy ID" />{mode === "confirmation" && <Link href={`/track/${b.ref}?t=${token}`} className="btn btn-dark !min-h-[40px] !py-2">Track booking</Link>}</div>
      </div>
      {/* What we still need from the customer: first thing they see, important items marked in words and colour. */}
      {cur !== -1 && data.requests.length > 0 && <section aria-labelledby="need-h" className="mt-6 rounded-2xl border-2 border-ink bg-white p-5 shadow-[0_10px_30px_rgba(20,16,16,.08)]">
        <h2 id="need-h" className="font-display text-xl font-extrabold">What we need from you</h2>
        <p className="mt-1 text-sm text-ink/70">Please take care of {data.requests.length === 1 ? "this" : "these"} so everything is ready for your trip.</p>
        <ul className="mt-4 space-y-3">{data.requests.map((r) => (
          <li key={r.id} className={`rounded-xl p-4 ${r.important ? "bg-red-50 ring-2 ring-red-200" : "bg-gold-500/15"}`}>
            <p className="text-[16px] font-bold leading-snug">{r.important && <span className="mr-2 inline-block rounded bg-red-700 px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-white">Important</span>}{r.title}</p>
            {r.detail && <p className="mt-1 whitespace-pre-line text-[15px] text-ink/80">{r.detail}</p>}
            {r.upload && <div className="mt-3 print:hidden">
              {r.upload.kind === "PASSPORT" && "passports" in r.upload ? <ul className="space-y-2">{r.upload.passports.map((p) => (
                <li key={p.travelerId} className="rounded-lg bg-white p-3">
                  <p className="font-semibold">{p.name}</p>
                  {p.state === "RECEIVED" ? <p className="text-sm font-semibold text-[#17663A]">✓ Received, thank you</p>
                    : p.state === "CHECKING" ? <p className="text-sm font-semibold text-[#14545B]">Received. We're checking it.</p>
                    : <>{p.state === "REJECTED" && <p className="text-sm font-semibold text-red-700">We couldn't accept the last one: {p.reason}</p>}
                      <RequestUpload bookingRef={b.ref} token={token} requestId={r.id} travelerId={p.travelerId} kind="PASSPORT" label="passport" again={p.state === "REJECTED"} /></>}
                </li>))}</ul>
              : "state" in r.upload && (r.upload.state === "CHECKING" ? <p className="rounded-lg bg-white p-3 text-sm font-semibold text-[#14545B]">Received. We're checking it and will confirm shortly.</p>
                : <>{r.upload.state === "REJECTED" && <p className="mb-1 text-sm font-semibold text-red-700">We couldn't accept the last one: {r.upload.reason}</p>}
                  <RequestUpload bookingRef={b.ref} token={token} requestId={r.id} kind={r.upload.kind} label={r.upload.kind === "PAYMENT_PROOF" ? "payment receipt" : "file"} again={r.upload.state === "REJECTED"} currency={b.currency} /></>)}
            </div>}
          </li>))}</ul>
        <p className="mt-4 text-sm text-ink/70 print:hidden">Prefer WhatsApp? <a href={waLink(`Hi Egypt Knight, about my booking ${b.ref}: `)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Send it to us there</a> instead.</p>
      </section>}
      {mode === "confirmation" && <p className="mt-2 text-sm text-ink/65">Keep this ID. You can track your booking any time at <b>/track</b> with your ID and email.</p>}

      {cur === -1 ? <div className="mt-8 rounded-2xl bg-red-50 p-5 font-semibold text-red-800">This booking was cancelled.</div> : (
        <ol className="mt-8 grid gap-4 sm:grid-cols-5" aria-label="Booking status">
          {MILESTONES.map((m, i) => { const done = i < cur || (i === cur && cur === 4), now = i === cur && cur !== 4; const date = when(m.types); return (
            <li key={m.key} className="relative">
              <span className={`block h-1.5 rounded-full ${done ? "bg-gold-500" : now ? "bg-ink" : "bg-ink/10"}`} />
              <p className={`mt-2 text-sm font-semibold ${done || now ? "text-ink" : "text-ink/65"}`}>{m.label}</p>
              <p className="text-xs text-ink/65">{date ?? (now ? "In progress" : "")}</p></li>); })}
        </ol>)}
      <p className="mt-5 rounded-xl bg-ink/[.04] p-4 text-[15px] text-ink/80"><b>What's next: </b>{NEXT[b.status] ?? NEXT.PENDING}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-ink/15 p-5">
          <div className="flex gap-4"><SiteImage src={tour.imageUrl} alt="" destination={dest.slug} className="relative h-24 w-32 shrink-0 rounded-xl" />
            <div>{custom || tour.status !== "PUBLISHED" ? <p className="font-display text-xl font-bold">{b.titleOverride || tour.title}</p> : <Link href={`/tours/${tour.slug}`} className="font-display text-xl font-bold hover:underline">{b.titleOverride || tour.title}</Link>}{!custom && <p className="text-sm text-ink/65">{dest.name}</p>}</div></div>
          <dl className="mt-5 space-y-3 text-sm">
            {([["Date", nice(b.travelDate)], ["Travelers", people], ["Style", styleLabel(b.isPrivate)], ["Pickup", pickup.summary || "To be confirmed"], ["Meeting point", pickup.meetingPoint || "We'll message you"], ["Extras", data.addons.length ? data.addons.map((a) => a.name).join(", ") : "None"]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6"><dt className="shrink-0 text-ink/65">{k}</dt><dd className="min-w-0 whitespace-pre-line break-words text-right font-medium">{v}</dd></div>))}
            {b.specialRequests && <div className="flex justify-between gap-6"><dt className="text-ink/65">Requests</dt><dd className="max-w-[60%] whitespace-pre-line text-right font-medium">{b.specialRequests}</dd></div>}
          </dl>
        </section>
        {market ? <section className="rounded-2xl border border-ink/15 p-5 text-sm" data-prepaid={market}>
          <h2 className="font-display text-lg font-bold">Payment</h2>
          <p className="mt-3 font-semibold">Paid in full through {market}.</p>
          <p className="mt-1 text-ink/65">There is nothing more to pay us for this booking. For your receipt or any change to your payment, please use your {market} account.</p>
        </section> : <section className="rounded-2xl border border-ink/15 p-5 text-sm">
          <h2 className="font-display text-lg font-bold">Payment</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between"><dt className="text-ink/65">Subtotal</dt><dd>{money(b.subtotal, b.currency)}</dd></div>
            {b.discount > 0 && <div className="flex justify-between"><dt className="text-ink/65">Discount</dt><dd className="text-[#1a7f45]">−{money(b.discount, b.currency)}</dd></div>}
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold"><dt>Total</dt><dd>{money(b.total, b.currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/65">Paid so far</dt><dd>{money(data.paid, b.currency)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Still to pay</dt><dd>{money(data.due, b.currency)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-ink/65">{paymentNote(b, data.paid, data.due)}</p>
        </section>}
      </div>

      {data.docs.length > 0 && <section className="mt-6 rounded-2xl border border-ink/15 p-5 print:hidden"><h2 className="font-display text-lg font-bold">Your documents</h2>
        <ul className="mt-3 divide-y divide-ink/10 text-sm">{latestDocs(data.docs).latest.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 py-2.5"><span><span className="font-semibold">{d.kind === "INVOICE" ? "Invoice" : "Itinerary"}</span> <span className="text-ink/65">{d.number} · {short(d.sentAt)}</span></span><a href={d.url} className="btn btn-outline !min-h-[38px] !py-1.5">Download PDF</a></li>)}</ul>
        {latestDocs(data.docs).older.length > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-ink/65">Earlier versions ({latestDocs(data.docs).older.length})</summary>
          <ul className="mt-1 divide-y divide-ink/10">{latestDocs(data.docs).older.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-ink/70"><span>{d.kind === "INVOICE" ? "Invoice" : "Itinerary"} {d.number} · {short(d.sentAt)}</span><a href={d.url} className="font-semibold underline">Download</a></li>)}</ul>
        </details>}</section>}

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <WhatsAppButton href={wa} label="Message us about this booking" />
        <a href={`/api/booking/${b.ref}/ics?t=${token}`} className="btn btn-outline">Add to calendar</a>
        <PrintButton />
        <Link href="/tours" className="btn btn-outline">Explore more tours</Link>
      </div>
      {mode === "confirmation" && <p className="mt-6 text-xs text-ink/65 print:hidden">A confirmation email is not sent automatically yet. Save this page or your booking ID.</p>}
    </div>
  );
}
