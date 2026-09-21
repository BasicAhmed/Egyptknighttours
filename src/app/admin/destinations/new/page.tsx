import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import Notice from "@/components/Notice";
import { createDestination } from "../../import-actions";
export const dynamic = "force-dynamic";
export default async function NewDestination({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  await requireStaff("tours"); const sp = await searchParams;
  return (
    <div><Link href="/admin/destinations" className="text-sm text-ink/65">← Destinations</Link><h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">New destination</h1><div className="mt-3"><Notice e={sp.e} /></div>
      <form action={createDestination} className="mt-4 grid gap-4 rounded-2xl border border-ink/10 bg-white p-5"><label className="block"><span className="label">Name (for example Marsa Alam)</span><input name="name" required minLength={2} className="input" /></label>
        <label className="block"><span className="label">Tagline (optional)</span><input name="tagline" className="input" /></label><label className="block"><span className="label">Overview (optional, you can edit it next)</span><textarea name="overview" rows={4} className="input" /></label><button className="btn btn-primary !min-h-[46px] w-fit">Create and edit</button></form></div>
  );
}
