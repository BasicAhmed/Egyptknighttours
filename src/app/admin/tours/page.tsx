import Link from "next/link";
import { db, schema as s } from "@/db";
import { desc, eq, ne } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import { deleteTour } from "../actions";
import { money } from "@/lib/format";
export const dynamic = "force-dynamic";
const tone = (st: string) => (st === "PUBLISHED" ? "bg-[#DFF3E6] text-[#17663A]" : st === "DRAFT" ? "bg-gold-500/25 text-[#6B4A0C]" : "bg-ink/10 text-ink/60");
export default async function AdminTours() {
  const u = await requireStaff(); const can = PERMS.tours.includes(u.role);
  const rows = await db.select().from(s.tours).where(ne(s.tours.slug, "custom-experience")).orderBy(desc(s.tours.updatedAt));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">Tours</h1><p className="text-sm text-ink/55">What customers can book on the website.</p></div>{can && <Link href="/admin/tours/new" className="btn btn-primary !min-h-[46px]">+ New tour</Link>}</div>
      <div className="mt-3 flex gap-2"><span className="rounded-full border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white">Tours</span><Link href="/admin/destinations" className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink/70">Destinations</Link></div>
      <ul className="mt-5 space-y-2.5">{rows.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4">
          <div className="min-w-0"><p className="truncate font-display text-[17px] font-extrabold">{t.title}</p><p className="text-sm text-ink/55">{money(t.discountPrice ?? t.price)} {t.pricingModel === "PER_GROUP" ? "per group" : "per person"} · {t.popularity} bookings</p></div>
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${tone(t.status)}`}>{t.status === "PUBLISHED" ? "Live" : t.status === "DRAFT" ? "Draft" : "Archived"}</span>
            {t.status === "PUBLISHED" && <a className="btn btn-outline !min-h-[38px] !py-1.5 !text-[13px]" href={`/tours/${t.slug}`} target="_blank" rel="noopener noreferrer">View</a>}
            {can && <><Link className="btn btn-dark !min-h-[38px] !py-1.5 !text-[13px]" href={`/admin/tours/${t.id}`}>Edit</Link><form action={deleteTour.bind(null, t.id)}><button className="btn btn-outline !min-h-[38px] !py-1.5 !text-[13px] text-red-700">Delete</button></form></>}</div></li>))}</ul>
    </div>
  );
}
