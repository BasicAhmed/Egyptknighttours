import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { newOrdersFor, getsOrderAlerts } from "@/lib/order-alerts";
export const dynamic = "force-dynamic";
// The "New order" alert asks this every 30 seconds: the signed-in staff member's unseen new orders. Never cached.
export async function GET() {
  const u = await getSession(); if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = getsOrderAlerts(u.role) ? await newOrdersFor(u.uid) : { orders: [], count: 0 };
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
