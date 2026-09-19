import { db, schema as s } from "../../../db";
import { desc } from "drizzle-orm";
import { requireStaff, PERMS } from "../../../lib/auth";
import { LEAD_STATUS } from "../../../lib/validation";
import { setLead } from "../actions";
import { waLink } from "../../../lib/format";
export const dynamic = "force-dynamic";
export default async function Leads() {
  const u = await requireStaff(); const can = PERMS.leads.includes(u.role);
  const rows = await db.select().from(s.leads).orderBy(desc(s.leads.createdAt)).limit(100);
  return <div><h1 className="h2">Leads</h1><p className="text-sm text-ink/60">{rows.length} most recent. Pipeline: {LEAD_STATUS.join(" → ")}.</p>
    <div className="mt-4 space-y-3">{rows.map((l) => <details key={l.id} className="card p-4"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2"><span className="font-semibold">{l.name} <span className="font-normal text-ink/60">· {l.email}</span></span><span className="flex gap-2"><span className="badge">{l.kind}</span><span className="badge">{l.status}</span></span></summary>
      <div className="mt-3 grid gap-1 text-sm text-ink/80 sm:grid-cols-2"><p>Country: {l.country ?? "–"}</p><p>Dates: {l.travelDates ?? "–"}</p><p>Travellers: {l.travelers ?? "–"}</p><p>Budget: {l.budget ?? "–"}</p><p>Interests: {l.interests ?? "–"}</p><p>Source: {l.source ?? "–"}</p><p className="sm:col-span-2 whitespace-pre-line">Message: {l.message ?? "–"}</p><p>Marketing consent: {l.consentMarketing ? "yes" : "no"}</p><p>Next follow-up: {l.nextFollowUpAt?.toISOString().slice(0, 10) ?? "–"}</p></div>
      {l.whatsapp && <a className="btn btn-wa mt-3" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hi " + l.name + ", it's Egypt Knight. Thanks for your enquiry!")}`}>WhatsApp {l.name.split(" ")[0]}</a>}
      {can && <form action={setLead.bind(null, l.id)} className="mt-3 grid gap-2 sm:grid-cols-3"><select name="status" defaultValue={l.status} className="input">{LEAD_STATUS.map((x) => <option key={x}>{x}</option>)}</select><input name="next" type="date" className="input" aria-label="Next follow-up" /><button className="btn btn-dark">Update</button><textarea name="notes" defaultValue={l.notes ?? ""} rows={2} placeholder="Notes" className="input sm:col-span-3" /></form>}</details>)}
      {!rows.length && <p className="text-ink/60">No leads yet. They'll appear when someone uses the trip builder, contact form or books.</p>}</div>
    <span className="hidden">{waLink("")}</span></div>;
}
