import { notFound } from "next/navigation";
import Link from "next/link";
import { db, schema as s } from "@/db";
import { desc, eq } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import { publishItineraryAsTour } from "../../doc-actions";
import { money } from "@/lib/format";
import { parseJson } from "@/lib/format";
import ItineraryEditor from "@/components/ItineraryEditor";
import Notice from "@/components/Notice";
import type { ItineraryContent } from "@/pdf/types";
export const dynamic = "force-dynamic";

export default async function EditItinerary({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ n?: string; e?: string; flow?: string }> }) {
  const u = await requireStaff("itineraries"); const { id } = await params; const sp = await searchParams;
  const flowTip: Record<string, string> = {
    customer: "This is set up for your customer, with their name, dates and travelers filled in. Build the day-by-day plan, then use Payment & documents on their order to send the PDF.",
    tour: "Build the day-by-day plan here. When it looks right, scroll down to \u201cAdd this itinerary as a tour on the website\u201d to publish it.",
    template: "This is a template. Fill it in with your usual plan for this trip, then use it to start new itineraries from the New itinerary page.",
    pdf: "Fill in the trip details and the day-by-day plan, then use Preview above to download the PDF.",
  };
  const [it] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, id)); if (!it) notFound();
  const bookings = await db.select({ id: s.bookings.id, ref: s.bookings.ref, name: s.customers.name, date: s.bookings.travelDate }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).orderBy(desc(s.bookings.createdAt)).limit(60);
  const linkedCurrency = it.bookingId ? (await db.select({ currency: s.bookings.currency }).from(s.bookings).where(eq(s.bookings.id, it.bookingId)))[0]?.currency ?? "USD" : "USD";
  const docs = await db.select().from(s.documents).where(eq(s.documents.itineraryId, id)).orderBy(desc(s.documents.createdAt));
  const dests = await db.select({ id: s.destinations.id, name: s.destinations.name }).from(s.destinations).orderBy(s.destinations.name);
  const tour = it.tourId ? (await db.select().from(s.tours).where(eq(s.tours.id, it.tourId)))[0] : undefined;
  // Only an itinerary created with "For the website (a tour)" can ever be published as a tour — that has to be a deliberate choice, made at creation, never an accident on a customer's private itinerary.
  const canTour = PERMS.tours.includes(u.role) && !it.isTemplate && (it.intent === "tour" || !!it.tourId);
  return (
    <div>
      <Link href={it.isTemplate ? "/admin/itineraries?tab=templates" : "/admin/itineraries"} className="text-sm text-ink/65">← Itineraries</Link>
      <div className="mt-3"><Notice n={sp.n} e={sp.e} /></div>
      {sp.flow && flowTip[sp.flow] && <div className="mt-3 rounded-2xl border border-gold-600/40 bg-gold-500/10 p-4 text-sm"><b>Next step: </b>{flowTip[sp.flow]}</div>}
      <ItineraryEditor id={it.id} isTemplate={it.isTemplate} status={it.status} currency={linkedCurrency} initial={{ name: it.name, description: it.description, bookingId: it.bookingId, costPrice: it.costPrice, marginPercent: it.marginPercent, content: parseJson<ItineraryContent>(it.content, null as never) }}
        bookings={bookings.map((b) => ({ id: b.id, label: `${b.ref} · ${b.name} · ${b.date}` }))}
        docs={docs.map((d) => ({ id: d.id, number: d.number, sent: d.sentAt ? d.sentAt.toISOString().slice(0, 10) : null, created: d.createdAt.toISOString().slice(0, 10) }))} />
      {canTour && (
        <section className="mt-6 rounded-2xl border border-gold-600/40 bg-gold-500/10 p-5">
          <h2 className="font-display text-xl font-extrabold">{tour ? "Website tour" : "Add this itinerary as a tour on the website"}</h2>
          <p className="mt-1 text-sm text-ink/65">{tour ? <>This itinerary is published as <b>{tour.title}</b> ({tour.status === "PUBLISHED" ? "live" : "draft"}, {money(tour.price)}). Save your itinerary changes first, then update the tour to match.</> : "Customers will be able to book it like any other tour. The title, description, days, highlights, included and excluded lists and the cover photo come from this itinerary. Save your changes first."}</p>
          <form action={publishItineraryAsTour.bind(null, id)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="pd">Destination</label><select id="pd" name="destinationId" defaultValue={tour?.destinationId} className="input" required>{dests.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="label" htmlFor="pp">Price (USD)</label><input id="pp" name="price" type="number" step="0.01" min="0" defaultValue={tour?.price} className="input" required /></div>
            <div><label className="label" htmlFor="pm">Price is</label><select id="pm" name="pricingModel" defaultValue={tour?.pricingModel ?? "PER_PERSON"} className="input"><option value="PER_PERSON">Per person</option><option value="PER_GROUP">Per group</option></select></div>
            <div><label className="label" htmlFor="ps">Website status</label><select id="ps" name="status" defaultValue={tour?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"} className="input"><option value="DRAFT">Draft (only you can see it)</option><option value="PUBLISHED">Published (live on the website)</option></select></div>
            {!tour && <div className="sm:col-span-2"><label className="label" htmlFor="pslug">Web address (optional)</label><input id="pslug" name="slug" placeholder="8-days-cairo-nile-cruise" className="input" /></div>}
            <div className="flex flex-wrap gap-2 sm:col-span-2"><button className="btn btn-primary !min-h-[46px]">{tour ? "Update the tour" : "Create the tour"}</button>{tour && <><a className="btn btn-outline !min-h-[46px]" href={`/admin/tours/${tour.id}`}>Edit tour details</a>{tour.status === "PUBLISHED" && <a className="btn btn-outline !min-h-[46px]" href={`/tours/${tour.slug}`} target="_blank" rel="noopener noreferrer">View on website</a>}</>}</div>
          </form></section>)}
    </div>
  );
}
