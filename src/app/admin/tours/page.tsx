import Link from "next/link";
import { db, schema as s } from "@/db";
import { desc, eq, ne } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import { deleteTour } from "../actions";
import { money } from "@/lib/format";
import ConfirmButton from "@/components/ConfirmButton";
export const dynamic = "force-dynamic";
const tone = (st: string) => (st === "PUBLISHED" ? "bg-[#DFF3E6] text-[#17663A]" : st === "DRAFT" ? "bg-[#FBE4B4] text-[#6B4A0C]" : "bg-white text-ink/65");
export default async function AdminTours() {
  const u = await requireStaff(); const can = PERMS.tours.includes(u.role); const canFinance = PERMS.finance.includes(u.role);
  const rows = await db.select().from(s.tours).where(ne(s.tours.slug, "custom-experience")).orderBy(desc(s.tours.updatedAt));
  const live = rows.filter((t) => t.status === "PUBLISHED").length;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-[26px] font-extrabold leading-tight sm:text-[32px]">Tours</h1><p className="text-sm text-ink/60">{live} live on the website, {rows.length - live} not published.</p></div>{can && <div className="flex gap-2"><Link href="/admin/tours/import" className="btn btn-outline">Import CSV</Link><Link href="/admin/tours/new" className="btn btn-primary"><span aria-hidden="true" className="-ml-0.5 text-lg leading-none">+</span>New tour</Link></div>}</div>
      <div className="seg mt-4"><span aria-current="page">Tours</span><Link href="/admin/destinations">Destinations</Link></div>
      <ul className="mt-4 grid gap-2.5 lg:grid-cols-2">{rows.map((t) => (
        <li key={t.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_0_rgba(20,16,16,.04)]">
          <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-[#F1EEE7] sm:h-24 sm:w-28">
            {t.imageUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.imageUrl.startsWith("/api/media/") ? `${t.imageUrl}?w=480` : t.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center px-2 text-center text-[11px] font-semibold text-ink/45">No photo</span>}
            <span className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${tone(t.status)}`}>{t.status === "PUBLISHED" ? "Live" : t.status === "DRAFT" ? "Draft" : "Archived"}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="line-clamp-2 font-display text-[16px] font-extrabold leading-snug">{t.title}</p>
            <p className="mt-0.5 text-[13.5px] text-ink/60"><b className="text-ink">{money(t.discountPrice ?? t.price)}</b> {t.pricingModel === "PER_GROUP" ? "per group" : "per person"}, {t.popularity} booking{t.popularity === 1 ? "" : "s"}</p>
            {canFinance && t.priceMode === "MARGIN" && t.costPrice != null && <p className="text-[12.5px] text-ink/55">Cost ${t.costPrice}, {t.marginPercent}% profit</p>}
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[13.5px] font-semibold">
              {can && <Link className="rounded-lg bg-ink px-3 py-1.5 text-white hover:bg-black" href={`/admin/tours/${t.id}`}>Edit</Link>}
              {t.status === "PUBLISHED" && <a className="text-ink/75 underline-offset-4 hover:underline" href={`/tours/${t.slug}`} target="_blank" rel="noopener noreferrer">View</a>}
              <a className="text-ink/75 underline-offset-4 hover:underline" href={`/api/tours/${t.slug}/pdf`}>PDF</a>
              {can && <form action={deleteTour.bind(null, t.id)} className="ml-auto"><ConfirmButton confirmText={`Delete "${t.title}"? Tours with bookings are archived instead.`} className="text-red-700 underline-offset-4 hover:underline">Delete</ConfirmButton></form>}
            </div>
          </div></li>))}</ul>
      {!rows.length && <div className="mt-4 rounded-2xl border border-dashed border-ink/20 px-6 py-12 text-center"><p className="font-display text-lg font-bold">No tours yet</p><p className="mt-1 text-sm text-ink/60">Add your first tour, or import a list from a CSV file.</p></div>}
    </div>
  );
}
