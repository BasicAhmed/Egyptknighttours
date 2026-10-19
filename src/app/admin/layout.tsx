import type { Metadata } from "next";
import { getSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { db, schema as sch } from "@/db";
import { eq, sql } from "drizzle-orm";
import { stageOf } from "@/components/order-ui";
import BuilderCredit from "@/components/BuilderCredit";
import NewOrderAlert from "@/components/NewOrderAlert";
import { newOrdersFor, getsOrderAlerts, type NewOrders } from "@/lib/order-alerts";
export const metadata: Metadata = { title: "Staff panel", robots: { index: false, follow: false } };
async function logout() { "use server"; await destroySession(); redirect("/admin/login"); }
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  const credit = <BuilderCredit prefix="Built by" dark={false} />;
  if (!s) return <div className="adm min-h-screen bg-ink">{children}</div>;
  // Waiting counts on the menu: new orders to handle, and new inquiries nobody has answered yet.
  const badges: Record<string, number> = {};
  try {
    const [byStatus, newLeads] = await Promise.all([
      db.select({ status: sch.bookings.status, n: sql<number>`count(*)` }).from(sch.bookings).groupBy(sch.bookings.status),
      db.select({ n: sql<number>`count(*)` }).from(sch.leads).where(eq(sch.leads.status, "NEW")),
    ]);
    // Only orders waiting for staff. Orders waiting for the customer's decision are not counted: nothing to do until they reply.
    const todo = byStatus.filter((r) => stageOf(r.status) === "NEW").reduce((a, r) => a + Number(r.n), 0);
    if (todo) badges["/admin"] = todo; if (Number(newLeads[0]?.n)) badges["/admin/leads"] = Number(newLeads[0].n);
  } catch { /* the counts are a convenience only */ }
  // The big "New order" alert, for the people who handle orders. Loaded with the page so it shows the moment the panel opens.
  let alerts: NewOrders | null = null;
  if (getsOrderAlerts(s.role)) { try { alerts = await newOrdersFor(s.uid); } catch (e) { console.error("new-order alert not loaded", e instanceof Error ? e.message : e); alerts = { orders: [], count: 0 }; } }
  return <AdminShell user={{ name: s.name, role: s.role }} logout={logout} credit={<BuilderCredit prefix="Built by" />} creditLight={<BuilderCredit prefix="Built by" dark={false} />} badges={badges}>{alerts && <NewOrderAlert initial={alerts} />}{children}</AdminShell>;
}
