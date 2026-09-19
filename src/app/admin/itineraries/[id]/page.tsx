import { notFound } from "next/navigation";
import Link from "next/link";
import { db, schema as s } from "@/db";
import { desc, eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { parseJson } from "@/lib/format";
import ItineraryEditor from "@/components/ItineraryEditor";
import Notice from "@/components/Notice";
import type { ItineraryContent } from "@/pdf/types";
export const dynamic = "force-dynamic";

export default async function EditItinerary({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ n?: string; e?: string }> }) {
  await requireStaff("itineraries"); const { id } = await params; const sp = await searchParams;
  const [it] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, id)); if (!it) notFound();
  const bookings = await db.select({ id: s.bookings.id, ref: s.bookings.ref, name: s.customers.name, date: s.bookings.travelDate }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).orderBy(desc(s.bookings.createdAt)).limit(60);
  const docs = await db.select().from(s.documents).where(eq(s.documents.itineraryId, id)).orderBy(desc(s.documents.createdAt));
  return (
    <div>
      <Link href={it.isTemplate ? "/admin/itineraries?tab=templates" : "/admin/itineraries"} className="text-sm text-ink/60">← Itineraries</Link>
      <div className="mt-3"><Notice n={sp.n} e={sp.e} /></div>
      <ItineraryEditor id={it.id} isTemplate={it.isTemplate} status={it.status} initial={{ name: it.name, description: it.description, bookingId: it.bookingId, content: parseJson<ItineraryContent>(it.content, null as never) }}
        bookings={bookings.map((b) => ({ id: b.id, label: `${b.ref} · ${b.name} · ${b.date}` }))}
        docs={docs.map((d) => ({ id: d.id, number: d.number, sent: d.sentAt ? d.sentAt.toISOString().slice(0, 10) : null, created: d.createdAt.toISOString().slice(0, 10) }))} />
    </div>
  );
}
