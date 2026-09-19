import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema as s } from "@/db";
import { asc, desc, eq } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import { BOOKING_STATUS, BOOKING_STATUS_LABEL } from "@/lib/validation";
import { bookingDocuments, docUrl } from "@/lib/documents";
import { buildInvoiceData } from "@/lib/invoice";
import { generateInvoice, emailDoc, markSent, addPayment, changeStatus, createItinerary, generateItineraryPdf } from "../../doc-actions";
import { money, parseJson } from "@/lib/format";
import Notice from "@/components/Notice";
export const dynamic = "force-dynamic";

const fdate = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ n?: string; e?: string }> }) {
  const u = await requireStaff(); const { id } = await params; const sp = await searchParams;
  const [row] = await db.select({ b: s.bookings, tour: s.tours, c: s.customers }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.bookings.id, id));
  if (!row) notFound();
  const { b, tour, c } = row;
  const canDocs = PERMS.documents.includes(u.role), canPay = PERMS.bookings.includes(u.role), canIt = PERMS.itineraries.includes(u.role);
  const [docs, payments, methods, templates, its] = await Promise.all([
    bookingDocuments(id),
    db.select().from(s.payments).where(eq(s.payments.bookingId, id)).orderBy(desc(s.payments.createdAt)),
    db.select().from(s.paymentMethods).where(eq(s.paymentMethods.active, true)).orderBy(asc(s.paymentMethods.sortOrder)),
    db.select().from(s.itineraries).where(eq(s.itineraries.isTemplate, true)).orderBy(asc(s.itineraries.name)),
    db.select().from(s.itineraries).where(eq(s.itineraries.bookingId, id)).orderBy(desc(s.itineraries.updatedAt)),
  ]);
  const preview = await buildInvoiceData(id);
  const invoices = docs.filter((d) => d.kind === "INVOICE"), itDocs = docs.filter((d) => d.kind === "ITINERARY");
  const paid = payments.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);
  const wa = (d: (typeof docs)[number], label: string) => `https://wa.me/${(c.whatsapp || c.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${c.name.split(" ")[0]}, here's your ${label} from Egypt Knight: ${docUrl(d.id)}`)}`;
  const DocRow = ({ d }: { d: (typeof docs)[number] }) => (
    <li className="rounded-xl border border-ink/10 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{d.number}{d.kind === "INVOICE" && d.amount != null ? <span className="font-normal text-ink/60"> · due now {money(d.amount, d.currency)}</span> : null}</p><span className="badge">{d.sentAt ? `Sent ${fdate(d.sentAt)}${d.sentVia ? " · " + d.sentVia.toLowerCase() : ""}` : "Not sent yet"}</span></div>
      <p className="text-xs text-ink/55">Created {fdate(d.createdAt)}{d.sentTo ? ` · to ${d.sentTo}` : ""}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a className="btn btn-outline !min-h-[38px] !py-1.5" href={`/api/documents/${d.id}/pdf?inline=1`} target="_blank" rel="noopener noreferrer">Preview</a>
        <a className="btn btn-outline !min-h-[38px] !py-1.5" href={`/api/documents/${d.id}/pdf`}>Download</a>
        {canDocs && <form action={emailDoc.bind(null, id, d.id)} className="flex gap-1"><input name="to" type="email" placeholder={c.email} className="input !w-44 !py-1.5 text-sm" aria-label="Email to" /><button className="btn btn-dark !min-h-[38px] !py-1.5">{d.sentAt ? "Resend" : "Email"}</button></form>}
        {c.whatsapp && <a className="btn btn-wa !min-h-[38px] !py-1.5" target="_blank" rel="noopener noreferrer" href={wa(d, d.kind === "INVOICE" ? "invoice" : "itinerary")}>WhatsApp</a>}
        {canDocs && !d.sentAt && <form action={markSent.bind(null, id, d.id, "WHATSAPP")}><button className="btn btn-outline !min-h-[38px] !py-1.5">Mark as sent</button></form>}
      </div>
    </li>
  );
  return (
    <div className="space-y-8">
      <div><Link href="/admin/bookings" className="text-sm text-ink/60">← All bookings</Link><div className="mt-1 flex flex-wrap items-center justify-between gap-3"><h1 className="h2">{b.ref} · {tour.title}</h1><span className="badge">{BOOKING_STATUS_LABEL[b.status] ?? b.status}</span></div>
        <p className="text-sm text-ink/60">{c.name} · {c.email} · {c.whatsapp} · {b.travelDate} · {b.adults}A {b.children}C {b.infants}I · {b.isPrivate ? "Private" : "Shared"}</p></div>
      <Notice n={sp.n} e={sp.e} />

      <section className="card p-5">
        <h2 className="font-display text-xl font-bold">Documents</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between"><h3 className="font-semibold">Invoice</h3><span className="text-sm text-ink/60">{invoices.length ? (invoices[0].sentAt ? `Sent ${fdate(invoices[0].sentAt)}` : "Generated, not sent") : "Not created"} · {BOOKING_STATUS_LABEL[b.status] ?? b.status}</span></div>
            <ul className="mt-3 space-y-2">{invoices.map((d) => <DocRow key={d.id} d={d} />)}</ul>
            {canDocs && <details className="mt-3 rounded-xl border border-ink/10 p-3" open={invoices.length === 0}>
              <summary className="cursor-pointer font-semibold">{invoices.length ? "Create a new invoice version" : "Generate invoice"}</summary>
              <form action={generateInvoice.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                <div><label className="label">Currency</label><input name="currency" defaultValue={preview?.currency} className="input" /></div>
                <div><label className="label">Amount due now</label><input name="dueNow" type="number" step="0.01" defaultValue={preview?.dueNow} className="input" /></div>
                <div><label className="label">Payment deadline</label><input name="deadline" type="date" defaultValue={preview?.deadline} className="input" /></div>
                <div><label className="label">Booking status after</label><select name="status" defaultValue="AUTO" className="input"><option value="AUTO">Invoiced, awaiting payment (automatic)</option><option value="KEEP">Keep current status</option>{BOOKING_STATUS.map((x) => <option key={x} value={x}>{BOOKING_STATUS_LABEL[x]}</option>)}</select></div>
                <div className="sm:col-span-2"><label className="label">Extra fees or taxes (one per line: Label | amount)</label><textarea name="extras" rows={2} placeholder="Service fee | 25" className="input" /></div>
                <div className="sm:col-span-2"><label className="label">Note to customer (optional)</label><textarea name="notes" rows={2} className="input" /></div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="sendNow" className="h-5 w-5 accent-black" />Email it to {c.email} now</label>
                <div className="flex flex-wrap gap-2 sm:col-span-2"><button className="btn btn-primary">Generate invoice PDF</button><a className="btn btn-outline" href={`/api/admin/preview/invoice/${id}`} target="_blank" rel="noopener noreferrer">Preview draft</a></div>
              </form></details>}
          </div>
          <div>
            <div className="flex items-center justify-between"><h3 className="font-semibold">Itinerary</h3><span className="text-sm text-ink/60">{its[0] ? `${its[0].status === "DRAFT" ? "Draft" : its[0].status === "READY" ? "PDF ready" : "Sent"}` : "Not created"}</span></div>
            <ul className="mt-3 space-y-2">{its.map((it) => (
              <li key={it.id} className="rounded-xl border border-ink/10 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{it.name}</p><span className="badge">{it.status}</span></div>
                <div className="mt-2 flex flex-wrap gap-2"><Link className="btn btn-outline !min-h-[38px] !py-1.5" href={`/admin/itineraries/${it.id}`}>Edit</Link><a className="btn btn-outline !min-h-[38px] !py-1.5" href={`/api/admin/preview/itinerary/${it.id}`} target="_blank" rel="noopener noreferrer">Preview</a>
                  {canIt && <form action={generateItineraryPdf.bind(null, it.id)}><button className="btn btn-dark !min-h-[38px] !py-1.5">Generate PDF</button></form>}</div></li>))}</ul>
            {itDocs.length > 0 && <><p className="mt-4 text-sm font-semibold">Generated itinerary PDFs</p><ul className="mt-2 space-y-2">{itDocs.map((d) => <DocRow key={d.id} d={d} />)}</ul></>}
            {canIt && <details className="mt-3 rounded-xl border border-ink/10 p-3" open={its.length === 0}><summary className="cursor-pointer font-semibold">Create itinerary from a template</summary>
              <form action={createItinerary} className="mt-3 grid gap-3"><input type="hidden" name="bookingId" value={id} />
                <div><label className="label">Template</label><select name="templateId" className="input"><option value="">Blank itinerary</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div><label className="label">Name</label><input name="name" defaultValue={`${tour.title} for ${c.name}`} className="input" /></div>
                <button className="btn btn-primary">Create and customize</button></form></details>}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-xl font-bold">Payments</h2>
        <p className="mt-1 text-sm text-ink/70">Total {money(b.total, b.currency)} · Paid {money(paid, b.currency)} · Balance <b>{money(Math.max(0, b.total - paid), b.currency)}</b></p>
        <ul className="mt-3 space-y-1 text-sm">{payments.filter((p) => p.status !== "SUPERSEDED").map((p) => <li key={p.id} className="flex justify-between border-b border-ink/5 py-1"><span>{fdate(p.createdAt)} · {p.provider}{p.providerRef ? ` · ${p.providerRef}` : ""}</span><span className={p.status === "PAID" ? "font-semibold" : "text-ink/50"}>{money(p.amount, b.currency)} {p.status !== "PAID" && `(${p.status.toLowerCase()})`}</span></li>)}{!payments.length && <li className="text-ink/50">No payments recorded.</li>}</ul>
        {canPay && <form action={addPayment.bind(null, id)} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div><label className="label">Amount received</label><input name="amount" type="number" step="0.01" min="0" defaultValue={Math.max(0, b.total - paid) || ""} className="input" required /></div>
          <div><label className="label">Method</label><input name="method" list="methods" defaultValue="Bank transfer" className="input" /><datalist id="methods">{methods.map((m) => <option key={m.id} value={m.label} />)}<option value="Cash" /></datalist></div>
          <div><label className="label">Reference / note</label><input name="note" className="input" /></div>
          <div className="flex items-end"><button className="btn btn-primary w-full">Record payment</button></div>
          <p className="text-xs text-ink/55 sm:col-span-4">Enter the full balance to mark the booking as paid, or a smaller amount for a partial payment. The status updates automatically.</p></form>}
        {canPay && <form action={changeStatus.bind(null, id)} className="mt-4 flex flex-wrap items-end gap-2"><div><label className="label">Booking status</label><select name="status" defaultValue={b.status} className="input">{BOOKING_STATUS.map((x) => <option key={x} value={x}>{BOOKING_STATUS_LABEL[x]}</option>)}</select></div><button className="btn btn-outline">Update status</button></form>}
      </section>
      <p className="text-xs text-ink/50">{parseJson<unknown[]>(b.addonsJson, []).length} add-on(s) · pickup: {b.hotel ?? "not given"}{b.specialRequests ? ` · requests: ${b.specialRequests}` : ""}</p>
    </div>
  );
}
