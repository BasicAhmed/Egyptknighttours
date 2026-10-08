import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, PERMS } from "@/lib/auth";
import {
  loadCorporateRequest, isCharged, isSettled, fmt as money, BUSINESS_TZ,
  SERVICE_TYPES, SERVICE_TYPE_LABEL, SERVICE_STATUS, SERVICE_STATUS_LABEL, REQUEST_STATUS, REQUEST_STATUS_LABEL, PRICING_MODE_LABEL, CORPORATE_CURRENCIES, EVENT_LABEL,
} from "@/lib/corporate";
import {
  updateCorporateRequest, setCorporateStatus, addCorporateService, updateCorporateService, deleteCorporateService, deleteCorporateRequest,
  addCorporatePayment, removeCorporatePayment, saveCorporateInvoiceNotes,
} from "../../corporate-actions";
import { waUrl } from "@/components/order-ui";
import Notice from "@/components/Notice";
import ConfirmButton from "@/components/ConfirmButton";
import CopyButton from "@/components/CopyButton";
import FormKeeper from "@/components/FormKeeper";
export const dynamic = "force-dynamic";

const F = ({ name, label, def, req, type = "text", cls = "", max, hint }: { name: string; label: string; def?: string | number | null; req?: boolean; type?: string; cls?: string; max?: number; hint?: string }) => (
  <label className={`block ${cls}`}><span className="label">{label}</span>
    <input name={name} type={type} step={type === "number" ? "any" : undefined} min={type === "number" ? 0 : undefined} max={max} required={req} defaultValue={def ?? ""} className="input !py-2" />
    {hint && <span className="mt-1 block text-xs text-ink/65">{hint}</span>}
  </label>
);
// A single field that works both ways: pick one of the common service types, or just type your own — no separate "Other" step needed.
const ServiceTypeField = ({ def }: { def?: string }) => (
  <label className="block"><span className="label">Service type</span>
    <input name="type" list="corp-service-types" defaultValue={def ? SERVICE_TYPE_LABEL[def] ?? def : ""} placeholder="Pick one or type your own" required className="input !py-2" />
  </label>
);
// Plain days (a service date) are shown as written; moments (a payment, a history line) in Cairo time, like the business.
const plainDay = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const day = (d: Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: BUSINESS_TZ });
const dayTime = (d: Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ });

export default async function CorporateDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ n?: string; e?: string }> }) {
  const u = await requireStaff("corporate"); const { id } = await params; const sp = await searchParams;
  const canFinance = PERMS.finance.includes(u.role);
  const data = await loadCorporateRequest(id); if (!data) notFound();
  const { request: r, services, prices, totals: t, payments, removedPayments, events, paid, balance } = data;
  const cur = r.currency;
  const pctMode = r.pricingMode === "PERCENTAGE";
  const cancelled = r.status === "CANCELLED";
  const settled = isSettled(t.price, paid);
  const overpaid = balance < -0.005;
  const barPct = t.price > 0 ? Math.min(100, Math.round((paid / t.price) * 100)) : 0;
  const unpricedCount = pctMode ? services.filter((sv) => isCharged(sv) && !(sv.cost > 0)).length : services.filter((sv) => isCharged(sv) && !(sv.price > 0)).length;
  // Why the payment form is not shown, in plain words (the same rules the server checks in paymentProblem). Paid in full
  // needs no extra line: the amount above already says it.
  const noPayment = cancelled ? "This request is cancelled, so no new payments can be recorded." : !(t.price > 0) ? "Price the services first: there is nothing to pay yet." : "";

  return (
    <div>
      <Link href="/admin/corporate" className="text-sm text-ink/65">← Corporate requests</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">{r.ref}</h1><p className="text-sm text-ink/65">{r.companyName}{r.customerName ? ` · for ${r.customerName}` : ""}</p></div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-outline !min-h-[44px]" href="#invoice">Invoice</a>
          <form action={setCorporateStatus.bind(null, r.id)} className="flex gap-2"><label className="sr-only" htmlFor="cr-status">Status</label><select id="cr-status" name="status" defaultValue={r.status} className="input !w-auto !py-2">{REQUEST_STATUS.map((v) => <option key={v} value={v}>{REQUEST_STATUS_LABEL[v]}</option>)}</select><button className="btn btn-dark !min-h-[44px]">Save</button></form>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="flex flex-wrap gap-2">
          {r.companyPhone && <a className="btn btn-wa !min-h-[44px]" target="_blank" rel="noopener noreferrer" href={waUrl(r.companyPhone, `Hi${r.companyContact ? ` ${r.companyContact.split(" ")[0]}` : ""}, it's Egypt Knight Tours about request ${r.ref}.`)}>WhatsApp{r.companyContact ? ` ${r.companyContact.split(" ")[0]}` : ""}</a>}
          {r.companyPhone && <a className="btn btn-outline !min-h-[44px]" href={`tel:${r.companyPhone.replace(/[^\d+]/g, "")}`}>Call</a>}
          {r.companyEmail && <a className="btn btn-outline !min-h-[44px]" href={`mailto:${r.companyEmail}`}>Email</a>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <CopyButton text={r.ref} label="Copy request ID" className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-[13px] font-semibold text-ink/70 hover:border-ink/40 hover:text-ink" />
        </div>
      </div>
      <div className="mt-3"><Notice n={sp.n} e={sp.e} /></div>
      {cancelled && <p role="status" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b>Cancelled.</b> {paid > 0 ? `${money(paid, cur)} had been paid. If it is refunded, remove those payments below so Finance stays right.` : "Nothing was paid on it."}</p>}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="stat-card"><p className="stat-label">Total cost</p><p className="stat-value">{canFinance ? money(t.cost, cur) : "—"}</p></div>
        <div className="stat-card"><p className="stat-label">Total price charged</p><p className="stat-value">{money(t.price, cur)}</p>{pctMode && <p className="mt-0.5 text-xs text-ink/65">{canFinance ? `${money(t.cost, cur)} cost + ` : "Cost + "}{r.servicePercent ?? 0}% service</p>}</div>
        <div className="stat-card"><p className="stat-label">Profit</p><p className={`stat-value ${canFinance ? (t.profit >= 0 ? "text-[#17663A]" : "text-red-700") : ""}`}>{canFinance ? money(t.profit, cur) : "—"}</p>{canFinance && t.price > 0 && <p className="mt-0.5 text-xs text-ink/65">{Math.round((t.profit / t.price) * 1000) / 10}% of the price</p>}</div>
      </div>
      {unpricedCount > 0 && <p className="mt-3 rounded-xl bg-gold-500/15 p-3 text-sm text-[#6B4708]">{unpricedCount} service{unpricedCount === 1 ? " has" : "s have"} no {pctMode ? "cost" : "selling price"} yet{pctMode && !canFinance ? ": an owner or manager needs to enter it" : ""}, so {unpricedCount === 1 ? "it adds" : "they add"} nothing to the total.</p>}

      <section className="card mt-5 p-5" aria-labelledby="pay-h">
        <h2 id="pay-h" className="font-display text-lg font-bold">Payment</h2>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm text-ink/65">Paid <b className="text-ink">{money(paid, cur)}</b> of {money(t.price, cur)}</p>
          <p className={`font-display text-xl font-extrabold ${overpaid ? "text-red-700" : settled ? "text-[#17663A]" : ""}`}>{overpaid ? `Overpaid by ${money(-balance, cur)}` : settled ? "Paid in full" : t.price > 0 ? `${money(balance, cur)} due` : "No services priced yet"}</p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10"><div className={`h-full rounded-full transition-all ${overpaid ? "bg-red-600" : "bg-gold-500"}`} style={{ width: `${barPct}%` }} /></div>
        {overpaid && <p className="mt-2 text-sm text-red-800">The total went down after payments were recorded. Refund or credit the difference to {r.companyName}, then remove or correct the payment that is too much.</p>}

        {payments.length > 0 && <ul className="mt-3 divide-y divide-ink/10 text-sm">{payments.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-ink/70">{day(p.createdAt)} · {p.method}{p.note ? ` · ${p.note}` : ""}</span>
            <span className="flex items-center gap-3"><b>{money(p.amount, cur)}</b>
              <form action={removeCorporatePayment.bind(null, p.id, r.id)}><ConfirmButton confirmText={`Remove the ${money(p.amount, cur)} payment from ${day(p.createdAt)}? Use this for a payment entered by mistake or refunded. It is kept in the history.`} className="text-xs font-semibold text-red-700 underline">Remove</ConfirmButton></form>
            </span>
          </li>))}
        </ul>}

        {!cancelled && t.price > 0 && balance > 0.005 ? <form action={addCorporatePayment.bind(null, r.id)} className="mt-4 grid gap-3 sm:grid-cols-3"><FormKeeper />
          <F name="amount" label={`Amount received (${cur})`} type="number" req def={balance} max={balance} hint={`Up to ${money(balance, cur)}`} />
          <div><label className="label" htmlFor="cp-method">Method</label><select id="cp-method" name="method" defaultValue="Bank transfer" className="input !py-2"><option>Bank transfer</option><option>Cash</option><option>Card</option><option>Other</option></select></div>
          <F name="note" label="Note (team only)" />
          <div className="sm:col-span-3"><button className="btn btn-primary !min-h-[44px]">Record payment</button></div>
        </form> : noPayment ? <p className="mt-3 text-sm text-ink/65">{noPayment}</p> : null}

        {removedPayments.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer text-ink/65">Removed payments ({removedPayments.length})</summary>
          <ul className="mt-1 divide-y divide-ink/10">{removedPayments.map((p) => <li key={p.id} className="flex justify-between py-1.5 text-ink/65"><span>{day(p.createdAt)} · {p.method}{p.note ? ` · ${p.note}` : ""}</span><s>{money(p.amount, cur)}</s></li>)}</ul>
        </details>}
      </section>

      <section id="invoice" className="card mt-5 scroll-mt-20 p-5" aria-labelledby="inv-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="inv-h" className="font-display text-lg font-bold">Invoice</h2>
          <a className="btn btn-primary !min-h-[44px]" href={`/api/admin/preview/corporate-invoice/${r.id}`} target="_blank" rel="noopener noreferrer">Generate invoice</a>
        </div>
        <p className="mt-1 text-sm text-ink/65">Lists every charged service with its price and the total{paid > 0 ? `, then the ${money(paid, cur)} already paid and ${settled || overpaid ? "that it is paid in full" : `the ${money(balance, cur)} still due`}` : ", the payments received and the balance due"}. Cost, profit and team notes are never on it.</p>
        <form action={saveCorporateInvoiceNotes.bind(null, r.id)} className="mt-3"><FormKeeper />
          <label className="label" htmlFor="cr-inv-notes">Notes on the invoice</label>
          <textarea id="cr-inv-notes" name="invoiceNotes" rows={3} maxLength={2000} defaultValue={r.invoiceNotes} placeholder="e.g. Please pay the balance by 15 November. Prices include entrance fees." className="input !py-2" />
          <p className="mt-1 text-xs text-ink/65">The partner sees these. Notes for the team go in the request details below.</p>
          <button className="btn btn-dark mt-2 !min-h-[42px] !py-2">Save invoice notes</button>
        </form>
      </section>

      <details className="card mt-5 p-5"><summary className="cursor-pointer font-display text-lg font-bold">Company, customer &amp; request details</summary>
        <form action={updateCorporateRequest.bind(null, r.id)} className="mt-4 grid gap-3 sm:grid-cols-2"><FormKeeper />
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
          <div><label className="label" htmlFor="cr-currency">Currency</label>
            <select id="cr-currency" name="currency" defaultValue={cur} className="input !py-2">{CORPORATE_CURRENCIES.map((c) => <option key={c} disabled={payments.length > 0 && c !== cur}>{c}</option>)}</select>
            {payments.length > 0 && <span className="mt-1 block text-xs text-ink/65">Locked: payments are recorded in {cur}.</span>}
          </div>
          <div className="sm:col-span-2"><label className="label" htmlFor="cr-notes">Internal notes <span className="font-normal text-ink/65">(team only, not on the invoice)</span></label><textarea id="cr-notes" name="notes" rows={3} maxLength={2000} defaultValue={r.notes} className="input !py-2" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="cr-req">Additional requirements <span className="font-normal text-ink/65">(shown on the invoice)</span></label><textarea id="cr-req" name="requirements" rows={2} maxLength={2000} defaultValue={r.requirements} className="input !py-2" /></div>
          <h3 className="mt-2 font-display text-base font-bold sm:col-span-2">Selling price</h3>
          <fieldset className="sm:col-span-2"><legend className="label">How is the price worked out?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-ink/15 p-3"><input type="radio" name="pricingMode" value="ITEMIZED" defaultChecked={!pctMode} className="mt-1" /><span><span className="block font-semibold">{PRICING_MODE_LABEL.ITEMIZED}</span><span className="text-sm text-ink/65">Set a selling price per service.{pctMode ? " Each service keeps the price it has now." : ""}</span></span></label>
              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-ink/15 p-3"><input type="radio" name="pricingMode" value="PERCENTAGE" defaultChecked={pctMode} className="mt-1" /><span><span className="block font-semibold">{PRICING_MODE_LABEL.PERCENTAGE}</span><span className="text-sm text-ink/65">Enter each service's cost; one percentage sets every price.</span></span></label>
            </div>
          </fieldset>
          <F name="servicePercent" label="Service percentage (for 'Fixed percentage')" type="number" def={r.servicePercent} max={500} />
          <p className="text-xs text-ink/65 sm:col-span-2">Changing the pricing changes the total. It can't go below what has already been paid.</p>
          <div className="sm:col-span-2"><button className="btn btn-dark !min-h-[44px]">Save details</button></div>
        </form>
      </details>

      <h2 className="mt-8 font-display text-xl font-extrabold">Services <span className="text-base font-normal text-ink/65">({services.filter(isCharged).length}{services.some((sv) => !isCharged(sv)) ? ` · ${services.filter((sv) => !isCharged(sv)).length} cancelled` : ""})</span></h2>
      <div className="mt-3 space-y-3">
        {services.map((sv, i) => {
          const off = !isCharged(sv);
          return (
            <details key={sv.id} className={`card p-4 ${off ? "opacity-70" : ""}`}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span><b className="font-display text-base font-bold">{SERVICE_TYPE_LABEL[sv.type] ?? sv.type}</b>{sv.label ? ` — ${sv.label}` : ""} <span className="text-sm text-ink/65">{sv.date ? plainDay(sv.date) : "No date"}{sv.time ? ` ${sv.time}` : ""}{sv.location ? ` · ${sv.location}` : ""}</span>
                  {sv.status !== "PENDING" && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${off ? "bg-red-50 text-red-700" : "bg-ink/10 text-ink/70"}`}>{off ? "Cancelled · not charged" : SERVICE_STATUS_LABEL[sv.status] ?? sv.status}</span>}
                </span>
                <span className="text-right text-sm">{off ? <s className="text-ink/65">{money(pctMode ? sv.cost * (1 + (r.servicePercent ?? 0) / 100) : sv.price, cur)}</s> : <b>{money(prices[i], cur)}</b>}{pctMode && canFinance && !off && <span className="block text-xs text-ink/65">cost {money(sv.cost, cur)} + {r.servicePercent ?? 0}%</span>}</span>
              </summary>
              <form action={updateCorporateService.bind(null, sv.id, r.id)} className="mt-4 grid gap-3 sm:grid-cols-3"><FormKeeper />
                <ServiceTypeField def={sv.type} />
                <F name="label" label="Description" def={sv.label} cls="sm:col-span-2" />
                <F name="date" label="Date" type="date" def={sv.date} />
                <F name="time" label="Time (optional)" def={sv.time} />
                <F name="location" label="Location" def={sv.location} />
                <F name="people" label="Number of people" type="number" def={sv.people} />
                <F name="supplier" label="Supplier" def={sv.supplier} />
                <div><label className="label" htmlFor={`sv-status-${sv.id}`}>Status</label><select id={`sv-status-${sv.id}`} name="status" defaultValue={sv.status} className="input !py-2">{SERVICE_STATUS.map((v) => <option key={v} value={v}>{SERVICE_STATUS_LABEL[v]}{v === "CANCELLED" ? " (not charged)" : ""}</option>)}</select></div>
                {canFinance && <F name="cost" label={`Supplier cost (${cur})`} type="number" def={sv.cost} req={pctMode} />}
                {!pctMode && <F name="price" label={`Selling price (${cur})`} type="number" def={sv.price} req />}
                {pctMode && <div><span className="label">Selling price</span><p className="input !py-2 bg-ink/5">{off ? "Not charged" : money(prices[i], cur)}</p><p className="mt-1 text-xs text-ink/65">Cost + {r.servicePercent ?? 0}%, worked out for you</p></div>}
                <div className="sm:col-span-3"><label className="label" htmlFor={`sv-notes-${sv.id}`}>Notes (team only)</label><textarea id={`sv-notes-${sv.id}`} name="notes" rows={2} maxLength={1000} defaultValue={sv.notes} className="input !py-2" /></div>
                <button className="btn btn-dark !min-h-[42px] !py-2 sm:col-span-3 sm:w-fit">Save service</button>
              </form>
              <form action={deleteCorporateService.bind(null, sv.id, r.id)} className="mt-2"><ConfirmButton confirmText={`Remove ${SERVICE_TYPE_LABEL[sv.type] ?? sv.type} from this request? To keep it on record but stop charging it, set its status to Cancelled instead.`} className="btn btn-outline !min-h-[42px] !py-2 text-red-700">Remove</ConfirmButton></form>
            </details>
          );
        })}
        {!services.length && <p className="card p-6 text-center text-sm text-ink/65">No services added yet.</p>}
      </div>

      <details className="card mt-4 p-4" open={!services.length}><summary className="cursor-pointer font-display text-base font-bold">+ Add a service</summary>
        <form action={addCorporateService.bind(null, r.id)} className="mt-4 grid gap-3 sm:grid-cols-3"><FormKeeper />
          <ServiceTypeField />
          <F name="label" label="Description" cls="sm:col-span-2" />
          <F name="date" label="Date" type="date" def={r.serviceDate} /><F name="time" label="Time (optional)" /><F name="location" label="Location" def={r.location} />
          <F name="people" label="Number of people" type="number" def={r.customerCount} /><F name="supplier" label="Supplier" />
          {canFinance && <F name="cost" label={`Supplier cost (${cur})`} type="number" req={pctMode} />}
          {!pctMode && <F name="price" label={`Selling price (${cur})`} type="number" req />}
          {pctMode && !canFinance && <p className="self-end text-xs text-ink/65 sm:col-span-2">This request is priced as cost + {r.servicePercent ?? 0}%. An owner or manager enters the cost, which sets the price.</p>}
          <div className="sm:col-span-3"><button className="btn btn-primary !min-h-[44px]">Add service</button></div>
        </form>
        <datalist id="corp-service-types">{SERVICE_TYPES.map(([, l]) => <option key={l} value={l} />)}</datalist>
      </details>

      <details className="card mt-5 p-5"><summary className="cursor-pointer font-display text-lg font-bold">History <span className="text-sm font-normal text-ink/65">({events.length})</span></summary>
        {events.length ? <ol className="mt-3 divide-y divide-ink/10 text-sm">{events.map((e) => (
          <li key={e.id} className="py-2"><p><b>{EVENT_LABEL[e.type] ?? e.type}</b>{e.note ? <span className="text-ink/75"> · {e.note}</span> : null}</p><p className="text-xs text-ink/65">{dayTime(e.createdAt)}{e.userName ? ` · ${e.userName}` : ""}</p></li>
        ))}</ol> : <p className="mt-3 text-sm text-ink/65">Changes made from now on are listed here: who did what, and when.</p>}
      </details>

      {canFinance && (payments.length
        ? <p className="mt-8 text-sm text-ink/65">This request has payments recorded, so it can't be deleted. Set it to Cancelled to close it.</p>
        : <form action={deleteCorporateRequest.bind(null, r.id)} className="mt-8"><ConfirmButton confirmText={`Delete request ${r.ref}? This removes its services and history for good. To keep the record, set it to Cancelled instead.`} className="text-sm font-semibold text-red-700 underline">Delete this request</ConfirmButton></form>)}
    </div>
  );
}
