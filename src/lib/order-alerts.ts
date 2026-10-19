import { client } from "@/db";
import { PERMS } from "./auth";

// ---------- "New order" alert in the staff panel ----------
// A new order is one that is still waiting for a first reply (the "New order" stage), arrived in the last 7 days, and that
// this staff member has not seen yet. Seen means: they opened it, or pressed "Got it" on the alert. Orders a person typed in
// themselves (+ New order) never alert that same person. Each person has their own list, so a colleague opening an order
// does not hide it from you.

export const ALERT_DAYS = 7;
export const NEW_STATUSES = ["INQUIRY", "PENDING", "CONFIRMED"] as const; // the "New order" stage (stageOf in order-ui.ts)
const MAX_SHOWN = 20;

export type NewOrder = { id: string; ref: string; name: string; title: string; travelDate: string; pax: number; source: string; country: string; createdAt: number };
export type NewOrders = { orders: NewOrder[]; count: number };

// Only the people who handle orders get the alert.
export const getsOrderAlerts = (role: string) => PERMS.bookings.includes(role);

export async function newOrdersFor(userId: string): Promise<NewOrders> {
  const since = Math.floor(Date.now() / 1000) - ALERT_DAYS * 86400;
  const where = `b.created_at >= ? and b.status in (${NEW_STATUSES.map(() => "?").join(",")})
    and not exists (select 1 from order_alerts_seen x where x.user_id = ? and x.booking_id = b.id)
    and not exists (select 1 from audit_logs a where a.created_at >= ? and a.entity = 'booking' and a.action = 'CREATE' and a.entity_id = b.id and a.user_id = ?)`;
  const args = [since, ...NEW_STATUSES, userId, since, userId];
  const [list, total] = await Promise.all([
    client.execute({ sql: `select b.id, b.ref, coalesce(nullif(b.guest_name, ''), c.name) as name, coalesce(nullif(b.title_override, ''), t.title) as title, b.travel_date as travelDate,
        (b.adults + b.children + b.infants) as pax, coalesce(b.source, 'WEBSITE') as source, coalesce(c.country, '') as country, b.created_at as createdAt
      from bookings b join tours t on t.id = b.tour_id join customers c on c.id = b.customer_id where ${where} order by b.created_at desc limit ${MAX_SHOWN}`, args }),
    client.execute({ sql: `select count(*) as n from bookings b where ${where}`, args }),
  ]);
  const orders = list.rows.map((r) => ({ id: String(r.id), ref: String(r.ref), name: String(r.name ?? ""), title: String(r.title ?? ""), travelDate: String(r.travelDate ?? ""), pax: Number(r.pax ?? 0), source: String(r.source ?? "WEBSITE"), country: String(r.country ?? ""), createdAt: Number(r.createdAt ?? 0) * 1000 }));
  return { orders, count: Number(total.rows[0]?.n ?? orders.length) };
}

// Marks orders as seen by this person. Ids that are not real orders are harmless: they simply never match.
export async function markOrdersSeen(userId: string, ids: string[]) {
  const clean = [...new Set(ids.filter((x) => typeof x === "string" && x.length > 0 && x.length <= 64))].slice(0, 100);
  if (!clean.length) return 0;
  await client.batch(clean.map((bookingId) => ({ sql: "insert into order_alerts_seen (id, user_id, booking_id) values (?, ?, ?) on conflict(user_id, booking_id) do nothing", args: [crypto.randomUUID(), userId, bookingId] })), "write");
  return clean.length;
}
