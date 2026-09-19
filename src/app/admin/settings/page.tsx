import { db, schema as s } from "@/db";
import { asc } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveCompanySettings, savePaymentMethod, deletePaymentMethod } from "../doc-actions";
import Notice from "@/components/Notice";
export const dynamic = "force-dynamic";
type M = typeof s.paymentMethods.$inferSelect;

const F = ({ name, label, v, type = "text", ph }: { name: string; label: string; v?: string | number; type?: string; ph?: string }) => <div><label className="label">{label}</label><input name={name} type={type} defaultValue={v ?? ""} placeholder={ph} className="input" /></div>;
function MethodForm({ m }: { m?: M }) {
  const act = savePaymentMethod.bind(null, m?.id ?? null);
  return (
    <form action={act} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label">Type</label><select name="kind" defaultValue={m?.kind ?? "BANK"} className="input"><option value="BANK">Bank transfer</option><option value="LINK">Payment link</option><option value="WISE">Wise</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></div>
      <F name="label" label="Label shown to customers" v={m?.label} ph="Bank transfer (EUR)" />
      <F name="currency" label="Currency (blank = any)" v={m?.currency} ph="EUR" />
      <F name="sortOrder" label="Order" type="number" v={m?.sortOrder ?? 0} />
      <F name="bankName" label="Bank name" v={m?.bankName} /><F name="accountName" label="Account name" v={m?.accountName} />
      <F name="accountNumber" label="Account number" v={m?.accountNumber} /><F name="iban" label="IBAN" v={m?.iban} />
      <F name="swift" label="SWIFT / BIC" v={m?.swift} /><F name="branch" label="Branch" v={m?.branch} />
      <div className="sm:col-span-2"><F name="bankAddress" label="Bank address" v={m?.bankAddress} /></div>
      <div className="sm:col-span-2"><F name="paymentUrl" label="Payment link (https://…), makes the PDF button clickable" v={m?.paymentUrl} /></div>
      <div className="sm:col-span-2"><label className="label">Extra payment instructions</label><textarea name="instructions" rows={2} defaultValue={m?.instructions} className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={m?.active ?? true} className="h-5 w-5 accent-black" />Show on new invoices</label>
      <div className="flex gap-2 sm:justify-end"><button className="btn btn-dark">{m ? "Save" : "Add payment method"}</button></div>
    </form>
  );
}
export default async function Settings({ searchParams }: { searchParams: Promise<{ n?: string; e?: string }> }) {
  await requireStaff("settings"); const sp = await searchParams;
  const g = await getSettings();
  const methods = await db.select().from(s.paymentMethods).orderBy(asc(s.paymentMethods.sortOrder), asc(s.paymentMethods.createdAt));
  const T = ({ k, label, rows = 4 }: { k: string; label: string; rows?: number }) => <div className="sm:col-span-2"><label className="label">{label}</label><textarea name={k} rows={rows} defaultValue={g[k]} className="input" /></div>;
  return (
    <div className="space-y-10">
      <div><h1 className="h2">Settings</h1><p className="text-sm text-ink/60">Everything here feeds the invoice and itinerary PDFs. Changes apply to PDFs you generate from now on.</p></div>
      <Notice n={sp.n} e={sp.e} />
      <section>
        <h2 className="font-display text-xl font-bold">Payment methods and bank details</h2>
        <p className="mb-4 text-sm text-ink/60">Bank details are stored here only, not in any template. Add a payment link to make the invoice button clickable.</p>
        <div className="space-y-4">
          {methods.map((m) => <details key={m.id} className="card p-4"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold">{m.label}<span className="flex gap-2"><span className="badge">{m.kind}</span>{m.currency && <span className="badge">{m.currency}</span>}<span className="badge">{m.active ? "Active" : "Hidden"}</span></span></summary>
            <div className="mt-4"><MethodForm m={m} /><form action={deletePaymentMethod.bind(null, m.id)} className="mt-3"><button className="btn btn-outline !min-h-[40px] !py-2 text-red-700">Delete this method</button></form></div></details>)}
          <details className="card p-4" open={methods.length === 0}><summary className="cursor-pointer font-semibold">+ Add a payment method</summary><div className="mt-4"><MethodForm /></div></details>
        </div>
      </section>
      <form action={saveCompanySettings} className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-display text-xl font-bold sm:col-span-2">Company and contact (shown on PDFs)</h2>
        <F name="company.name" label="Company name" v={g["company.name"]} /><F name="company.email" label="Email" v={g["company.email"]} />
        <F name="company.whatsapp" label="WhatsApp number" v={g["company.whatsapp"]} /><F name="company.phone" label="Phone" v={g["company.phone"]} />
        <F name="company.website" label="Website" v={g["company.website"]} /><F name="company.licence" label="Licence / registration number" v={g["company.licence"]} />
        <div className="sm:col-span-2"><F name="company.address" label="Address" v={g["company.address"]} /></div>
        <F name="company.signatureName" label="Signature name (optional)" v={g["company.signatureName"]} /><F name="company.signatureTitle" label="Signature title" v={g["company.signatureTitle"]} />
        <h2 className="mt-2 font-display text-xl font-bold sm:col-span-2">Invoice rules and wording</h2>
        <F name="invoice.depositDeadlineDays" label="Days to pay a deposit or full amount" type="number" v={g["invoice.depositDeadlineDays"]} /><F name="invoice.balanceDaysBefore" label="Balance due (days before travel)" type="number" v={g["invoice.balanceDaysBefore"]} />
        <T k="invoice.paymentTerms" label="Payment terms (one per line)" /><T k="invoice.documents" label="Documents to send (one per line)" rows={3} />
        <T k="invoice.cancellation" label="Cancellation policy (one per line)" rows={6} /><T k="invoice.note" label="Important payment note" rows={2} />
        <div className="sm:col-span-2"><button className="btn btn-primary">Save settings</button></div>
      </form>
    </div>
  );
}
