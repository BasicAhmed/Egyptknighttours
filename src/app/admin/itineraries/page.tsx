import Link from "next/link";
import { db, schema as s } from "@/db";
import { desc, eq, and } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import { createItinerary, duplicateItinerary, deleteItinerary } from "../doc-actions";
import Notice from "@/components/Notice";
import PdfImport from "@/components/PdfImport";
import { parseJson } from "@/lib/format";
import type { ItineraryContent } from "@/pdf/types";
import ConfirmButton from "@/components/ConfirmButton";
import FormKeeper from "@/components/FormKeeper";
export const dynamic = "force-dynamic";

export default async function Itineraries({ searchParams }: { searchParams: Promise<{ tab?: string; n?: string; e?: string }> }) {
  const u = await requireStaff(); const sp = await searchParams; const can = PERMS.itineraries.includes(u.role);
  const tab = sp.tab === "templates" ? "templates" : "mine";
  const rows = await db.select({ i: s.itineraries, ref: s.bookings.ref }).from(s.itineraries).leftJoin(s.bookings, eq(s.itineraries.bookingId, s.bookings.id)).where(eq(s.itineraries.isTemplate, tab === "templates")).orderBy(desc(s.itineraries.updatedAt));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-[26px] font-extrabold leading-tight sm:text-[32px]">Itineraries</h1><p className="text-sm text-ink/60">{tab === "templates" ? "Reusable trip plans. Start a new itinerary from any of them." : "Day-by-day trip plans, and the price of each order."}</p></div>
        {can && <Link href="/admin/itineraries/new" className="btn btn-primary"><span aria-hidden="true" className="-ml-0.5 text-lg leading-none">+</span>New itinerary</Link>}
      </div>
      <div className="seg mt-4"><Link href="/admin/itineraries" aria-current={tab === "mine" ? "page" : undefined}>Itineraries</Link><Link href="/admin/itineraries?tab=templates" aria-current={tab === "templates" ? "page" : undefined}>Templates</Link></div>
      <div className="mt-4"><Notice n={sp.n} e={sp.e} /></div>
      {can && <details className="group rounded-2xl bg-white p-4"><summary className="flex cursor-pointer items-center justify-between text-[14.5px] font-semibold">Import from a PDF you already have<span aria-hidden="true" className="text-ink/45 transition-transform group-open:rotate-45">+</span></summary><div className="mt-3"><PdfImport defaultTemplate={tab === "templates"} /></div></details>}
      <ul className="mt-3 space-y-2">
        {rows.map(({ i, ref }) => { const c = parseJson<ItineraryContent>(i.content, { days: [] } as never); const n = c.days?.length ?? 0; return (
          <li key={i.id} className="rounded-2xl bg-white p-3.5 shadow-[0_1px_0_rgba(20,16,16,.04)]"><div className="flex gap-3">
            <div className="flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#F7F5F0] leading-none"><b className="font-display text-xl font-extrabold">{n}</b><span className="mt-0.5 text-[11px] font-semibold text-ink/60">day{n === 1 ? "" : "s"}</span></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2"><Link href={`/admin/itineraries/${i.id}`} className="min-w-0 flex-1 font-display text-[16px] font-extrabold leading-snug hover:underline">{i.name}</Link>{!i.isTemplate && <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${i.status === "DRAFT" ? "bg-[#FBE4B4] text-[#6B4A0C]" : "bg-[#DFF3E6] text-[#17663A]"}`}>{i.status === "DRAFT" ? "Draft" : i.status.charAt(0) + i.status.slice(1).toLowerCase()}</span>}</div>
              <p className="mt-0.5 truncate text-[13.5px] text-ink/60">{ref ? `Order ${ref}` : i.isTemplate ? "Template" : "Not linked to an order"}{i.description ? `, ${i.description}` : ""}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px] font-semibold">
                <Link href={`/admin/itineraries/${i.id}`} className="rounded-lg bg-ink px-3 py-1.5 text-white hover:bg-black">Edit</Link>
                <a href={`/api/admin/preview/itinerary/${i.id}`} target="_blank" rel="noopener noreferrer" className="text-ink/75 underline-offset-4 hover:underline">Preview</a>
                {can && <form action={duplicateItinerary.bind(null, i.id)}><button className="text-ink/75 underline-offset-4 hover:underline">Duplicate</button></form>}
                {can && <form action={deleteItinerary.bind(null, i.id)} className="ml-auto"><ConfirmButton confirmText={`Delete "${i.name}"?`} className="text-red-700 underline-offset-4 hover:underline">Delete</ConfirmButton></form>}
              </div>
              {can && i.isTemplate && <form action={createItinerary} className="mt-3 flex gap-2"><FormKeeper /><input type="hidden" name="templateId" value={i.id} /><input name="name" aria-label="New itinerary name" placeholder="New itinerary name" className="input min-w-0 flex-1 !py-2 text-sm" /><button className="btn btn-primary !min-h-[40px] !py-2">Use template</button></form>}
            </div></div></li>); })}
        {!rows.length && <li className="rounded-2xl border border-dashed border-ink/20 px-6 py-12 text-center text-sm text-ink/60">{tab === "templates" ? "No templates yet. Open any itinerary and choose Save as template." : "No itineraries yet."}</li>}
      </ul>
    </div>
  );
}
