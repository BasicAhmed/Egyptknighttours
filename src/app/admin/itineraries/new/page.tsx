import Link from "next/link";
import { db, schema as s } from "@/db";
import { desc, eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { createItinerary } from "../../doc-actions";
import Notice from "@/components/Notice";
import CustomerItineraryStart from "@/components/CustomerItineraryStart";
import FormKeeper from "@/components/FormKeeper";
export const dynamic = "force-dynamic";

function Card({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <div className="card flex h-full flex-col gap-3 p-5">
      <div><h2 className="font-display text-lg font-extrabold">{title}</h2><p className="mt-1 text-sm text-ink/65">{blurb}</p></div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

export default async function NewItinerary({ searchParams }: { searchParams: Promise<{ e?: string; bookingId?: string }> }) {
  await requireStaff("itineraries"); const sp = await searchParams;
  const [bookingRows, templates, linkedRows] = await Promise.all([
    db.select({ id: s.bookings.id, ref: s.bookings.ref, name: s.customers.name, date: s.bookings.travelDate, status: s.bookings.status }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).orderBy(desc(s.bookings.createdAt)).limit(80),
    db.select({ id: s.itineraries.id, name: s.itineraries.name }).from(s.itineraries).where(eq(s.itineraries.isTemplate, true)).orderBy(s.itineraries.name),
    db.select({ bookingId: s.itineraries.bookingId }).from(s.itineraries),
  ]);
  // Only one itinerary is allowed per order until the trip is marked Completed — after that, another can be attached (e.g. a proposal for their next trip).
  const linked = new Set(linkedRows.map((r) => r.bookingId).filter(Boolean));
  const bookings = bookingRows.map((b) => ({ ...b, blocked: linked.has(b.id) && b.status !== "COMPLETED" }));
  const TemplatePicker = ({ idAttr, emptyLabel = "Blank, start from scratch" }: { idAttr: string; emptyLabel?: string }) => (
    <div><label className="label" htmlFor={idAttr}>Start from a template (optional)</label>
      <select id={idAttr} name="templateId" defaultValue="" className="input"><option value="">{emptyLabel}</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
    </div>
  );

  return (
    <div>
      <Link href="/admin/itineraries" className="text-sm font-semibold text-ink/65 hover:text-ink">← Itineraries</Link>
      <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight sm:text-[32px]">{sp.bookingId ? "Price this order" : "New itinerary"}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/60">{sp.bookingId ? "The itinerary is where the price is set. Choose how to start it, then enter the cost and profit margin in its Price step." : "Pick what this itinerary is for. Each one opens the editor, ready to fill in."}</p>
      <div className="mt-3"><Notice e={sp.e} /></div>

      {sp.bookingId && bookings.length > 0 && <div className="mt-4 max-w-xl"><Card title="For this customer" blurb="Their name, dates and travelers are filled in for you.">
        <CustomerItineraryStart bookings={bookings} templates={templates} defaultBookingId={sp.bookingId} action={createItinerary} /></Card></div>}
      {sp.bookingId && <p className="mt-8 text-sm font-semibold text-ink/60">Or make a different kind of itinerary</p>}

      <div className={`grid gap-4 sm:grid-cols-2 ${sp.bookingId ? "mt-3" : "mt-5"}`}>
        {!sp.bookingId && <Card title="For a customer" blurb="Attach it to one of your orders. Their name, dates and travelers are filled in for you, and its cost and profit margin set the order's price.">
          {bookings.length ? (
            <CustomerItineraryStart bookings={bookings} templates={templates} defaultBookingId="" action={createItinerary} />
          ) : (
            <p className="rounded-xl bg-ink/5 p-3 text-sm text-ink/65">No orders yet. <Link href="/admin" className="font-semibold underline">Create one first</Link>, then come back here.</p>
          )}
        </Card>}

        <Card title="For the website (a tour)" blurb="Build the day-by-day plan and price it, then publish it as a tour. Only an itinerary started here can ever become a website tour.">
          <form action={createItinerary} className="grid gap-3"><FormKeeper />
            <input type="hidden" name="kind" value="tour" />
            <TemplatePicker idAttr="w-template" />
            <button className="btn btn-primary !min-h-[46px]">Create tour itinerary</button>
          </form>
        </Card>

        <Card title="Create a template" blurb="A reusable base for trips you plan often, like 'Cairo & Nile Cruise, 8 days'. Use it to start any of the other three.">
          <form action={createItinerary} className="grid gap-3"><FormKeeper />
            <input type="hidden" name="kind" value="template" />
            <div><label className="label" htmlFor="t-name">Template name</label><input id="t-name" name="name" required placeholder="e.g. Cairo & Nile Cruise, 8 days" className="input" /></div>
            <TemplatePicker idAttr="t-template" emptyLabel="Blank template" />
            <button className="btn btn-primary !min-h-[46px]">Create template</button>
          </form>
        </Card>

        <Card title="Generate a quick PDF" blurb="A one-off itinerary to fill in and download. Not linked to a customer or an order, and can never become a website tour.">
          <form action={createItinerary} className="grid gap-3"><FormKeeper />
            <input type="hidden" name="kind" value="pdf" />
            <TemplatePicker idAttr="p-template" />
            <button className="btn btn-primary !min-h-[46px]">Create quick PDF</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
