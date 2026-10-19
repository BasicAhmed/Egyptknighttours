"use server";
import { getSession } from "@/lib/auth";
import { markOrdersSeen, getsOrderAlerts } from "@/lib/order-alerts";

// Called when someone opens an order or presses "Got it" on the new-order alert. It never redirects or throws: opening an
// order must keep working even if this small bookkeeping fails.
export async function ordersSeen(ids: string[]): Promise<{ ok: boolean }> {
  try {
    const u = await getSession();
    if (!u || !getsOrderAlerts(u.role) || !Array.isArray(ids)) return { ok: false };
    await markOrdersSeen(u.uid, ids.map(String));
    return { ok: true };
  } catch (e) { console.error("ordersSeen failed", e instanceof Error ? e.message : e); return { ok: false }; }
}
