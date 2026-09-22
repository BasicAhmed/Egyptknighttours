import { db, schema as s } from "@/db";
import { asc, eq, ne, and } from "drizzle-orm";
import { requireStaff, PERMS } from "@/lib/auth";
import { listOrders } from "@/lib/orders";
import OrdersBoard from "@/components/OrdersBoard";
import AutoRefresh from "@/components/AutoRefresh";
export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ open?: string; denied?: string }> }) {
  const u = await requireStaff(); const sp = await searchParams; const canFinance = PERMS.finance.includes(u.role);
  // Two queries, run together: the order list (with payment and document counts) and the tour names for "New order".
  const [rows, tours] = await Promise.all([listOrders(), db.select({ id: s.tours.id, title: s.tours.title }).from(s.tours).where(and(eq(s.tours.status, "PUBLISHED"), ne(s.tours.slug, "custom-experience"))).orderBy(asc(s.tours.title))]);
  return <><AutoRefresh />{sp.denied && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">Your role doesn't have access to that section.</p>}<OrdersBoard initial={rows} tours={tours} openId={sp.open} canFinance={canFinance} /></>;
}
