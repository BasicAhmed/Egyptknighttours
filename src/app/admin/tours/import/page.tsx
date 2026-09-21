import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import Notice from "@/components/Notice";
import { runTourImport } from "../../import-actions";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export default async function ImportTours({ searchParams }: { searchParams: Promise<{ n?: string; e?: string }> }) {
  await requireStaff("tours"); const sp = await searchParams; const g = await getSettings(); const host = (g["company.website"] ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return (
    <div><Link href="/admin/tours" className="text-sm text-ink/65">← Tours</Link><h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Import tours from a spreadsheet</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/70">Moving from another website? Put your tours in a spreadsheet, export it as CSV, and import it here. Every tour arrives as a <b>draft</b> so nothing goes live until you check it. Missing destinations are created automatically, and photos are copied from your old website.</p>
      <div className="mt-4"><Notice n={sp.n} e={sp.e} /></div>
      <form action={runTourImport} className="mt-4 grid gap-4 rounded-2xl border border-ink/10 bg-white p-5">
        <div><label className="label" htmlFor="file">CSV file</label><input id="file" name="file" type="file" accept=".csv,text/csv" className="input" /></div>
        <div><label className="label" htmlFor="csv">Or paste the CSV here</label><textarea id="csv" name="csv" rows={7} className="input font-mono text-xs" placeholder="title,slug,destination,category,price,..." /></div>
        <div><label className="label" htmlFor="hosts">Photos come from these websites (https only)</label><input id="hosts" name="hosts" defaultValue={host} placeholder="your-old-site.com" className="input" /><p className="mt-1 text-xs text-ink/65">Only these websites are used to download photos, for safety.</p></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="skipImages" className="h-5 w-5 accent-black" />Skip photos for now (faster; add them later)</label>
        <div className="flex flex-wrap gap-2"><button className="btn btn-primary !min-h-[46px]">Import as drafts</button><a href="/api/admin/tour-template" className="btn btn-outline !min-h-[46px]">Download the template</a></div>
        <p className="text-xs text-ink/65">Up to 40 tours at a time. For a larger site, import in batches. Existing tours with the same web address are never overwritten. Prices such as $1.550,00 or 1,550.50 are understood. Separate lists with the | symbol. Itinerary items look like <code>Day 1: Cairo: Arrive and rest</code>.</p>
      </form>
    </div>
  );
}
