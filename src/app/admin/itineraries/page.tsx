import Link from "next/link";
import { db, schema as s } from "@/db";
import { desc, eq, and } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import { createItinerary, duplicateItinerary, deleteItinerary } from "../doc-actions";
import Notice from "@/components/Notice";
import PdfImport from "@/components/PdfImport";
import { parseJson } from "@/lib/format";
import type { ItineraryContent } from "@/pdf/types";
export const dynamic = "force-dynamic";

export default async function Itineraries({ searchParams }: { searchParams: Promise<{ tab?: string; n?: string; e?: string }> }) {
  const u = await requireStaff(); const sp = await searchParams; const can = PERMS.itineraries.includes(u.role);
  const tab = sp.tab === "templates" ? "templates" : "mine";
  const rows = await db.select({ i: s.itineraries, ref: s.bookings.ref }).from(s.itineraries).leftJoin(s.bookings, eq(s.itineraries.bookingId, s.bookings.id)).where(eq(s.itineraries.isTemplate, tab === "templates")).orderBy(desc(s.itineraries.updatedAt));
  const templates = await db.select().from(s.itineraries).where(and(eq(s.itineraries.isTemplate, true)));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="h2">Itineraries</h1>
        <div className="flex gap-2"><Link href="/admin/itineraries" className={`btn ${tab === "mine" ? "btn-dark" : "btn-outline"} !min-h-[40px] !py-2`}>Itineraries</Link><Link href="/admin/itineraries?tab=templates" className={`btn ${tab === "templates" ? "btn-dark" : "btn-outline"} !min-h-[40px] !py-2`}>Templates</Link></div></div>
      <div className="mt-4"><Notice n={sp.n} e={sp.e} /></div>
      {can && <div className="mt-2"><PdfImport defaultTemplate={tab === "templates"} /></div>}
      {can && tab === "mine" && <form action={createItinerary} className="mt-3 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
        <div><label className="label">Start from</label><select name="templateId" className="input"><option value="">Blank itinerary</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className="label">Name</label><input name="name" placeholder="e.g. Ahmed family, October" className="input" /></div>
        <div className="flex items-end"><button className="btn btn-primary w-full">Create</button></div></form>}
      <ul className="mt-5 space-y-3">
        {rows.map(({ i, ref }) => { const c = parseJson<ItineraryContent>(i.content, { days: [] } as never); return (
          <li key={i.id} className="card p-4"><div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold">{i.name}</p><p className="text-sm text-ink/60">{c.days?.length ?? 0} days{ref ? ` · booking ${ref}` : ""}{i.description ? ` · ${i.description}` : ""}</p></div>
            <div className="flex flex-wrap items-center gap-2">{!i.isTemplate && <span className="badge">{i.status}</span>}
              <Link href={`/admin/itineraries/${i.id}`} className="btn btn-dark !min-h-[38px] !py-1.5">Edit</Link>
              <a href={`/api/admin/preview/itinerary/${i.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-[38px] !py-1.5">Preview</a>
              {can && <form action={duplicateItinerary.bind(null, i.id)}><button className="btn btn-outline !min-h-[38px] !py-1.5">Duplicate</button></form>}
              {can && i.isTemplate && <form action={createItinerary} className="flex gap-1"><input type="hidden" name="templateId" value={i.id} /><input name="name" placeholder="New itinerary name" className="input !w-44 !py-1.5 text-sm" /><button className="btn btn-primary !min-h-[38px] !py-1.5">Use</button></form>}
              {can && <form action={deleteItinerary.bind(null, i.id)}><button className="btn btn-outline !min-h-[38px] !py-1.5 text-red-700">Delete</button></form>}
            </div></div></li>); })}
        {!rows.length && <li className="text-ink/60">{tab === "templates" ? "No templates yet. Open any itinerary and choose Save as template." : "No itineraries yet."}</li>}
      </ul>
    </div>
  );
}
