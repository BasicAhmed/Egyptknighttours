import { db, schema as s } from "@/db";
import { desc } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import LeadsBoard, { type LeadRow } from "@/components/LeadsBoard";
export const dynamic = "force-dynamic";
export default async function Leads() {
  const u = await requireStaff();
  const rows = await db.select().from(s.leads).orderBy(desc(s.leads.createdAt)).limit(300);
  const data: LeadRow[] = rows.map((l) => ({ id: l.id, name: l.name, email: l.email, whatsapp: l.whatsapp ?? "", phone: l.phone ?? "", country: l.country ?? "", kind: l.kind, status: l.status, source: l.source ?? "", travelDates: l.travelDates ?? "", travelers: l.travelers, budget: l.budget ?? "", interests: l.interests ?? "", message: l.message ?? "", notes: l.notes ?? "", consent: l.consentMarketing, createdAt: l.createdAt.getTime(), nextFollowUp: l.nextFollowUpAt ? l.nextFollowUpAt.toISOString().slice(0, 10) : "" }));
  return <LeadsBoard initial={data} canEdit={PERMS.leads.includes(u.role)} />;
}
