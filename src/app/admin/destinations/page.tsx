import Link from "next/link";
import { db, schema as s } from "@/db";
import { asc } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import SiteImage from "@/components/SiteImage";
export const dynamic = "force-dynamic";
export default async function AdminDestinations({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const u = await requireStaff(); const can = PERMS.tours.includes(u.role); const sp = await searchParams;
  const rows = await db.select().from(s.destinations).orderBy(asc(s.destinations.name));
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Destinations</h1>
      <div className="mt-3 flex gap-2"><Link href="/admin/tours" className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink/70">Tours</Link><span className="rounded-full border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white">Destinations</span></div>
      {sp.saved && <p className="mt-4 rounded-xl bg-[#E9F6EE] p-3 text-sm font-semibold text-[#17663A]">Destination saved.</p>}
      <p className="mt-4 text-sm text-ink/65">The photo you upload here appears on the homepage, the destination page, and on any tour in that destination that has no photo of its own.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">{rows.map((d) => (
        <li key={d.id} className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-3">
          <SiteImage src={d.imageUrl} alt={d.name} destination={d.slug} className="relative h-20 w-28 shrink-0 rounded-xl" sizes="112px" />
          <div className="min-w-0 flex-1"><p className="font-display text-lg font-extrabold">{d.name}</p><p className="truncate text-sm text-ink/65">{d.imageUrl ? "Custom photo" : "Illustration (no photo yet)"}</p></div>
          {can && <Link href={`/admin/destinations/${d.id}`} className="btn btn-dark !min-h-[40px] !py-2 !text-[14px]">Edit</Link>}</li>))}</ul>
    </div>
  );
}
