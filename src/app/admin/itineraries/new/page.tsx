import Link from "next/link";
import { db, schema as s } from "@/db";
import { desc, eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { createItinerary } from "../../doc-actions";
import Notice from "@/components/Notice";
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
  const [bookings, templates] = await Promise.all([
    db.select({ id: s.bookings.id, ref: s.bookings.ref, name: s.customers.name, date: s.bookings.travelDate }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).orderBy(desc(s.bookings.createdAt)).limit(80),
    db.select({ id: s.itineraries.id, name: s.itineraries.name }).from(s.itineraries).where(eq(s.itineraries.isTemplate, true)).orderBy(s.itineraries.name),
  ]);
  const TemplatePicker = ({ idAttr, emptyLabel = "Blank, start from scratch" }: { idAttr: string; emptyLabel?: string }) => (
    <div><label className="label" htmlFor={idAttr}>Start from a template (optional)</label>
      <select id={idAttr} name="templateId" defaultValue="" className="input"><option value="">{emptyLabel}</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
    </div>
  );

  return (
    <div>
      <Link href="/admin/itineraries" className="text-sm text-ink/65">← Itineraries</Link>
      <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">New itinerary</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/65">Pick what this itinerary is for. Each one takes you straight to the day-by-day editor, ready to fill in.</p>
      {sp.bookingId && <p className="mt-2 text-sm font-semibold text-[#17663A]">Order created. Now price it: choose "For a customer" below to build its itinerary and set the cost and profit margin.</p>}
      <div className="mt-3"><Notice e={sp.e} /></div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card title="For a customer" blurb="Attach it to one of your orders. Their name, dates and travelers are filled in for you. This is where you set the price — enter the cost and profit margin and the order's total is set for you.">
          {bookings.length ? (
            <form action={createItinerary} className="grid gap-3">
              <input type="hidden" name="kind" value="customer" />
              <div><label className="label" htmlFor="c-booking">Choose the order</label>
                <select id="c-booking" name="bookingId" required defaultValue={sp.bookingId ?? ""} className="input">
                  <option value="" disabled>Search by name or booking ID…</option>
                  {bookings.map((b) => <option key={b.id} value={b.id}>{b.ref} · {b.name} · {b.date}</option>)}
                </select>
              </div>
              <TemplatePicker idAttr="c-template" />
              <button className="btn btn-primary !min-h-[46px]">Create for this customer</button>
            </form>
          ) : (
            <p className="rounded-xl bg-ink/5 p-3 text-sm text-ink/65">No orders yet. <Link href="/admin" className="font-semibold underline">Create one first</Link>, then come back here.</p>
          )}
        </Card>

        <Card title="For the website (a tour)" blurb="Build the day-by-day plan and price it, then publish it as a tour. Only an itinerary started here can ever become a website tour.">
          <form action={createItinerary} className="grid gap-3">
            <input type="hidden" name="kind" value="tour" />
            <TemplatePicker idAttr="w-template" />
            <button className="btn btn-primary !min-h-[46px]">Create tour itinerary</button>
          </form>
        </Card>

        <Card title="Create a template" blurb="A reusable base for trips you plan often, like 'Cairo & Nile Cruise, 8 days'. Use it to start any of the other three.">
          <form action={createItinerary} className="grid gap-3">
            <input type="hidden" name="kind" value="template" />
            <div><label className="label" htmlFor="t-name">Template name</label><input id="t-name" name="name" required placeholder="e.g. Cairo & Nile Cruise, 8 days" className="input" /></div>
            <TemplatePicker idAttr="t-template" emptyLabel="Blank template" />
            <button className="btn btn-primary !min-h-[46px]">Create template</button>
          </form>
        </Card>

        <Card title="Generate a quick PDF" blurb="A one-off itinerary to fill in and download. Not linked to a customer or an order, and can never become a website tour.">
          <form action={createItinerary} className="grid gap-3">
            <input type="hidden" name="kind" value="pdf" />
            <TemplatePicker idAttr="p-template" />
            <button className="btn btn-primary !min-h-[46px]">Create quick PDF</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
