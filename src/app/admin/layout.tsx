import type { Metadata } from "next";
import { getSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { db, schema as sch } from "@/db";
import { eq, sql } from "drizzle-orm";
import { stageOf } from "@/components/order-ui";
import BuilderCredit from "@/components/BuilderCredit";
export const metadata: Metadata = { title: "Staff panel", robots: { index: false, follow: false } };
async function logout() { "use server"; await destroySession(); redirect("/admin/login"); }
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  const credit = <BuilderCredit prefix="Built by" dark={false} />;
  if (!s) return <div className="min-h-screen bg-[#F5F4F0] px-4">{children}<div className="pb-8 text-center text-xs text-ink/65"><BuilderCredit prefix="Website & booking system by" dark={false} /></div></div>;
  // Waiting counts on the menu: new orders to handle, and new inquiries nobody has answered yet.
  const badges: Record<string, number> = {};
  try {
    const [byStatus, newLeads] = await Promise.all([
      db.select({ status: sch.bookings.status, n: sql<number>`count(*)` }).from(sch.bookings).groupBy(sch.bookings.status),
      db.select({ n: sql<number>`count(*)` }).from(sch.leads).where(eq(sch.leads.status, "NEW")),
    ]);
    const todo = byStatus.filter((r) => ["NEW", "QUOTE"].includes(stageOf(r.status))).reduce((a, r) => a + Number(r.n), 0);
    if (todo) badges["/admin"] = todo; if (Number(newLeads[0]?.n)) badges["/admin/leads"] = Number(newLeads[0].n);
  } catch { /* the counts are a convenience only */ }
  return <AdminShell user={{ name: s.name, role: s.role }} logout={logout} credit={<BuilderCredit prefix="Built by" />} creditLight={<BuilderCredit prefix="Built by" dark={false} />} badges={badges}>{children}</AdminShell>;
}
