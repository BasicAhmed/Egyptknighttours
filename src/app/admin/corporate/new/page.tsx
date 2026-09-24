import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createCorporateRequest } from "../../corporate-actions";
import Notice from "@/components/Notice";
export const dynamic = "force-dynamic";

const F = ({ name, label, req, type = "text", ph, cls = "" }: { name: string; label: string; req?: boolean; type?: string; ph?: string; cls?: string }) => (
  <label className={`block ${cls}`}><span className="label">{label}</span><input name={name} type={type} required={req} placeholder={ph} className="input" /></label>
);

export default async function NewCorporateRequest({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  await requireStaff("corporate"); const sp = await searchParams;
  return (
    <div className="max-w-2xl">
      <Link href="/admin/corporate" className="text-sm text-ink/65">← Corporate requests</Link>
      <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">New corporate request</h1>
      <p className="mt-1 text-sm text-ink/65">Start with who asked and what it's for — you'll add the individual services (transfer, tickets, guide, etc.) on the next screen.</p>
      <div className="mt-3"><Notice e={sp.e} /></div>

      <form action={createCorporateRequest} className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-display text-lg font-bold sm:col-span-2">Company</h2>
        <F name="companyName" label="Requesting company" req ph="ABC Travel" />
        <F name="companyContact" label="Contact person" ph="Name of who to reach at the company" />
        <F name="companyEmail" label="Company email" type="email" />
        <F name="companyPhone" label="Company phone / WhatsApp" />

        <h2 className="mt-2 font-display text-lg font-bold sm:col-span-2">Customer (if known)</h2>
        <F name="customerName" label="Customer name" ph="Who the services are actually for" />
        <F name="customerContact" label="Customer contact" ph="Phone or email, if given" />
        <F name="customerCount" label="Number of people" type="number" />

        <h2 className="mt-2 font-display text-lg font-bold sm:col-span-2">Request details</h2>
        <F name="serviceDate" label="Service date (optional — services can each have their own)" type="date" />
        <F name="location" label="General location" ph="Cairo / Luxor / Aswan…" />
        <div><label className="label" htmlFor="cr-currency">Currency</label><select id="cr-currency" name="currency" defaultValue="USD" className="input">{["USD", "EUR", "GBP", "EGP", "AED", "SAR"].map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="cr-notes">General request notes</label><textarea id="cr-notes" name="notes" rows={3} className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="cr-req">Additional requirements</label><textarea id="cr-req" name="requirements" rows={2} className="input" /></div>

        <div className="sm:col-span-2"><button className="btn btn-primary !min-h-[48px]">Create request</button></div>
      </form>
    </div>
  );
}
