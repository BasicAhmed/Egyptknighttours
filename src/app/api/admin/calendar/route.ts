import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { calendarFeed, viewerFor } from "@/lib/calendar";
import { chunkRange } from "@/lib/calendar-core";
export const dynamic = "force-dynamic";
// One month of the calendar (its whole weeks) for the signed-in staff member. The page asks for the month on screen and
// its neighbours, one at a time, so it never holds more than what can be looked at.
export async function GET(req: Request) {
  const u = await getSession(); if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = new URL(req.url).searchParams; const month = p.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < "2000-01" || month > "2100-12") return NextResponse.json({ error: "Choose a month" }, { status: 400 });
  const events = await calendarFeed(chunkRange(month), viewerFor(u), { cancelled: p.get("cancelled") === "1" });
  return NextResponse.json({ month, events }, { headers: { "Cache-Control": "private, no-store" } });
}
