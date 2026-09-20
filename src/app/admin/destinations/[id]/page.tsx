import { notFound } from "next/navigation";
import Link from "next/link";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { saveDestination } from "../../actions";
import ImageField from "@/components/ImageField";
export const dynamic = "force-dynamic";
export default async function EditDestination({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireStaff("tours"); const { id } = await params; const { error } = await searchParams;
  const [d] = await db.select().from(s.destinations).where(eq(s.destinations.id, id)); if (!d) notFound();
  const T = ({ name, label, v, rows = 3, hint }: { name: string; label: string; v: string; rows?: number; hint?: string }) => <div className="sm:col-span-2"><label className="label" htmlFor={name}>{label}{hint && <span className="ml-2 font-normal text-ink/50">{hint}</span>}</label><textarea id={name} name={name} rows={rows} defaultValue={v} className="input" /></div>;
  return (
    <div><Link href="/admin/destinations" className="text-sm text-ink/60">← Destinations</Link><h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{d.name}</h1>
      <form action={saveDestination.bind(null, d.id)} className="mt-5 grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-2">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2"><ImageField name="imageUrl" label="Destination photo" value={d.imageUrl} hint="Upload a wide, good-looking photo. It's used on the homepage tiles and this destination's page." /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="tagline">Tagline</label><input id="tagline" name="tagline" defaultValue={d.tagline} className="input" /></div>
        <T name="overview" label="Overview" v={d.overview} rows={5} /><T name="bestTime" label="Best time to visit" v={d.bestTime} /><T name="howToGet" label="How to get there" v={d.howToGet} />
        <T name="whereToStay" label="Where to stay" v={d.whereToStay} /><T name="tips" label="Local tips" v={d.tips} />
        <div><label className="label" htmlFor="recommendedDays">Recommended time</label><input id="recommendedDays" name="recommendedDays" defaultValue={d.recommendedDays} className="input" /></div>
        <div><label className="label" htmlFor="seoTitle">Google title (max 70)</label><input id="seoTitle" name="seoTitle" defaultValue={d.seoTitle} className="input" /></div>
        <T name="seoDescription" label="Google description (max 170)" v={d.seoDescription} rows={2} />
        <div className="sm:col-span-2"><button className="btn btn-primary !min-h-[46px]">Save destination</button></div>
      </form></div>
  );
}
