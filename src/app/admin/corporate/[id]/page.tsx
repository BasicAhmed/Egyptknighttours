import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, PERMS } from "@/lib/auth";
import { loadCorporateRequest, SERVICE_TYPES, SERVICE_TYPE_LABEL, SERVICE_STATUS, SERVICE_STATUS_LABEL, REQUEST_STATUS, REQUEST_STATUS_LABEL } from "@/lib/corporate";
import { updateCorporateRequest, setCorporateStatus, addCorporateService, updateCorporateService, deleteCorporateService, deleteCorporateRequest, addCorporatePayment } from "../../corporate-actions";
import { waUrl } from "@/components/order-ui";
import Notice from "@/components/Notice";
import ConfirmButton from "@/components/ConfirmButton";
import CopyButton from "@/components/CopyButton";
export const dynamic = "force-dynamic";

const F = ({ name, label, def, req, type = "text", cls = "" }: { name: string; label: string; def?: string | number | null; req?: boolean; type?: string; cls?: string }) => (
  <label className={`block ${cls}`}><span className="label">{label}</span><input name={name} type={type} required={req} defaultValue={def ?? ""} className="input !py-2" /></label>
);
const money = (n: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

export default async function CorporateDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ n?: string; e?: string }> }) {
  const u = await requireStaff("corporate"); const { id } = await params; const sp = await searchParams;
  const canFinance = PERMS.finance.includes(u.role);
  const data = await loadCorporateRequest(id); if (!data) notFound();
  const { request: r, services, totals: t, payments, paid, balance } = data;
  const pct = t.price > 0 ? Math.min(100, Math.round((paid / t.price) * 100)) : 0;

  return (
    <div>
      <Link href="/admin/corporate" className="text-sm text-ink/65">← Corporate requests</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">{r.ref}</h1><p className="text-sm text-ink/65">{r.companyName}{r.customerName ? ` · for ${r.customerName}` : ""}</p></div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-outline !min-h-[44px]" href={`/api/admin/preview/corporate-invoice/${r.id}`} target="_blank" rel="noopener noreferrer">Generate invoice</a>
          <form action={setCorporateStatus.bind(null, r.id)} className="flex gap-2"><label className="sr-only" htmlFor="cr-status">Status</label><select id="cr-status" name="status" defaultValue={r.status} className="input !w-auto !py-2">{REQUEST_STATUS.map((v) => <option key={v} value={v}>{REQUEST_STATUS_LABEL[v]}</option>)}</select><button className="btn btn-dark !min-h-[44px]">Save</button></form>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="flex flex-wrap gap-2">
          {r.companyPhone && <a className="btn btn-wa !min-h-[44px]" target="_blank" rel="noopener noreferrer" href={waUrl(r.companyPhone, `Hi${r.companyContact ? ` ${r.companyContact.split(" ")[0]}` : ""}, it's Egypt Knight about request ${r.ref}.`)}>WhatsApp{r.companyContact ? ` ${r.companyContact.split(" ")[0]}` : ""}</a>}
          {r.companyPhone && <a className="btn btn-outline !min-h-[44px]" href={`tel:${r.companyPhone.replace(/[^\d+]/g, "")}`}>Call</a>}
          {r.companyEmail && <a className="btn btn-outline !min-h-[44px]" href={`mailto:${r.companyEmail}`}>Email</a>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <CopyButton text={r.ref} label="Copy request ID" className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-[13px] font-semibold text-ink/70 hover:border-ink/40 hover:text-ink" />
        </div>
      </div>
      <div className="mt-3"><Notice n={sp.n} e={sp.e} /></div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="stat-card"><p className="stat-label">Total cost</p><p className="stat-value">{canFinance ? money(t.cost, r.currency) : "—"}</p></div>
        <div className="stat-card"><p className="stat-label">Total price charged</p><p className="stat-value">{money(t.price, r.currency)}</p></div>
        <div className="stat-card"><p className="stat-label">Profit</p><p className={`stat-value ${canFinance ? (t.profit >= 0 ? "text-[#17663A]" : "text-red-700") : ""}`}>{canFinance ? money(t.profit, r.currency) : "—"}</p></div>
      </div>

      <div className="card mt-5 p-5">
        <h2 className="font-display text-lg font-bold">Payment</h2>
        <div className="mt-3 flex items-end justify-between"><p className="text-sm text-ink/65">Paid <b className="text-ink">{money(paid, r.currency)}</b> of {money(t.price, r.currency)}</p><p className="font-display text-xl font-extrabold">{balance > 0 ? `${money(balance, r.currency)} left` : "Paid in full"}</p></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${pct}%` }} /></div>
        {payments.length > 0 && <ul className="mt-3 divide-y divide-ink/10 text-sm">{payments.map((p) => <li key={p.id} className="flex justify-between py-1.5"><span className="text-ink/70">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {p.method}{p.note ? ` · ${p.note}` : ""}</span><span className="font-semibold">{money(p.amount, r.currency)}</span></li>)}</ul>}
        {balance > 0 && <form action={addCorporatePayment.bind(null, r.id)} className="mt-4 grid gap-3 sm:grid-cols-3">
          <F name="amount" label={`Amount received (${r.currency})`} type="number" req />
          <div><label className="label" htmlFor="cp-method">Method</label><select id="cp-method" name="method" defaultValue="Bank transfer" className="input !py-2"><option>Bank transfer</option><option>Cash</option><option>Card</option><option>Other</option></select></div>
          <F name="note" label="Note (optional)" />
          <div className="sm:col-span-3"><button className="btn btn-primary !min-h-[44px]">Record payment</button></div>
        </form>}
      </div>

      <details className="card mt-5 p-5"><summary className="cursor-pointer font-display text-lg font-bold">Company, customer &amp; request details</summary>
        <form action={updateCorporateRequest.bind(null, r.id)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <h3 className="font-display text-base font-bold sm:col-span-2">Company</h3>
          <F name="companyName" label="Requesting company" def={r.companyName} req />
          <F name="companyContact" label="Contact person" def={r.companyContact} />
          <F name="companyEmail" label="Company email" type="email" def={r.companyEmail} />
          <F name="companyPhone" label="Company phone / WhatsApp" def={r.companyPhone} />
          <h3 className="mt-2 font-display text-base font-bold sm:col-span-2">Customer (if known)</h3>
          <F name="customerName" label="Customer name" def={r.customerName} />
          <F name="customerContact" label="Customer contact" def={r.customerContact} />
          <F name="customerCount" label="Number of people" type="number" def={r.customerCount} />
          <h3 className="mt-2 font-display text-base font-bold sm:col-span-2">Request details</h3>
          <F name="serviceDate" label="Service date" type="date" def={r.serviceDate} />
          <F name="location" label="General location" def={r.location} />
          <div><label className="label" htmlFor="cr-currency">Currency</label><select id="cr-currency" name="currency" defaultValue={r.currency} className="input !py-2">{["USD", "EUR", "GBP", "EGP", "AED", "SAR"].map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="cr-notes">General request notes</label><textarea id="cr-notes" name="notes" rows={3} defaultValue={r.notes} className="input !py-2" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="cr-req">Additional requirements</label><textarea id="cr-req" name="requirements" rows={2} defaultValue={r.requirements} className="input !py-2" /></div>
          <div className="sm:col-span-2"><button className="btn btn-dark !min-h-[44px]">Save details</button></div>
        </form>
      </details>

      <h2 className="mt-8 font-display text-xl font-extrabold">Services <span className="text-base font-normal text-ink/65">({services.length})</span></h2>
      <div className="mt-3 space-y-3">
        {services.map((sv) => (
          <details key={sv.id} className="card p-4">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
              <span><b className="font-display text-base font-bold">{SERVICE_TYPE_LABEL[sv.type] ?? sv.type}</b>{sv.label ? ` — ${sv.label}` : ""} <span className="text-sm text-ink/65">{sv.date ? new Date(sv.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "No date"}{sv.location ? ` · ${sv.location}` : ""}</span></span>
              <span className="text-sm font-semibold">{money(sv.price, r.currency)}{canFinance && <span className="ml-2 text-ink/65">(profit {money(sv.price - sv.cost, r.currency)})</span>}</span>
            </summary>
            <form action={updateCorporateService.bind(null, sv.id, r.id)} className="mt-4 grid gap-3 sm:grid-cols-3">
              <div><label className="label" htmlFor={`sv-type-${sv.id}`}>Service type</label><select id={`sv-type-${sv.id}`} name="type" defaultValue={sv.type} className="input !py-2">{SERVICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <F name="label" label="Description" def={sv.label} cls="sm:col-span-2" />
              <F name="date" label="Date" type="date" def={sv.date} />
              <F name="time" label="Time (optional)" def={sv.time} />
              <F name="location" label="Location" def={sv.location} />
              <F name="people" label="Number of people" type="number" def={sv.people} />
              <F name="supplier" label="Supplier" def={sv.supplier} />
              <div><label className="label" htmlFor={`sv-status-${sv.id}`}>Status</label><select id={`sv-status-${sv.id}`} name="status" defaultValue={sv.status} className="input !py-2">{SERVICE_STATUS.map((v) => <option key={v} value={v}>{SERVICE_STATUS_LABEL[v]}</option>)}</select></div>
              {canFinance && <F name="cost" label={`Supplier cost (${r.currency})`} type="number" def={sv.cost} />}
              <F name="price" label={`Selling price (${r.currency})`} type="number" def={sv.price} req />
              <div className="sm:col-span-3"><label className="label" htmlFor={`sv-notes-${sv.id}`}>Notes</label><textarea id={`sv-notes-${sv.id}`} name="notes" rows={2} defaultValue={sv.notes} className="input !py-2" /></div>
              <button className="btn btn-dark !min-h-[42px] !py-2 sm:col-span-3 sm:w-fit">Save service</button>
            </form>
            <form action={deleteCorporateService.bind(null, sv.id, r.id)} className="mt-2"><ConfirmButton confirmText="Remove this service?" className="btn btn-outline !min-h-[42px] !py-2 text-red-700">Remove</ConfirmButton></form>
          </details>
        ))}
        {!services.length && <p className="card p-6 text-center text-sm text-ink/65">No services added yet.</p>}
      </div>

      <details className="card mt-4 p-4" open><summary className="cursor-pointer font-display text-base font-bold">+ Add a service</summary>
        <form action={addCorporateService.bind(null, r.id)} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="ns-type">Service type</label><select id="ns-type" name="type" defaultValue="TRANSFER" className="input !py-2">{SERVICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <F name="label" label="Description" cls="sm:col-span-2" />
          <F name="date" label="Date" type="date" /><F name="time" label="Time (optional)" /><F name="location" label="Location" />
          <F name="people" label="Number of people" type="number" /><F name="supplier" label="Supplier" />
          {canFinance && <F name="cost" label={`Supplier cost (${r.currency})`} type="number" />}
          <F name="price" label={`Selling price (${r.currency})`} type="number" req />
          <div className="sm:col-span-3"><button className="btn btn-primary !min-h-[44px]">Add service</button></div>
        </form>
      </details>

      <form action={deleteCorporateRequest.bind(null, r.id)} className="mt-8"><ConfirmButton confirmText={`Delete request ${r.ref}? This removes all its services too.`} className="text-sm font-semibold text-red-700 underline">Delete this request</ConfirmButton></form>
    </div>
  );
}
