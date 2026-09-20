import { NextResponse } from "next/server";
import { client } from "@/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Runs nightly (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const out: Record<string, number | string> = {};
  const now = Date.now();
  out.rateLimitsPruned = Number((await client.execute({ sql: "delete from rate_limits where window_start < ?", args: [now - 24 * 3600_000] })).rowsAffected);
  out.analyticsPruned = Number((await client.execute({ sql: "delete from analytics_events where created_at < ?", args: [Math.floor((now - 400 * 86400_000) / 1000)] })).rowsAffected);
  const days = Number((await getSettings())["privacy.passportRetentionDays"]) || 0;
  if (days > 0) {
    const cutoff = new Date(now - days * 86400_000).toISOString().slice(0, 10);
    out.passportFilesDeleted = Number((await client.execute({ sql: "delete from traveler_files where booking_id in (select id from bookings where travel_date < ?)", args: [cutoff] })).rowsAffected);
    out.passportNumbersCleared = Number((await client.execute({ sql: "update travelers set passport_number = null where passport_number is not null and booking_id in (select id from bookings where travel_date < ?)", args: [cutoff] })).rowsAffected);
  }
  out.at = new Date(now).toISOString();
  await client.execute({ sql: "insert into settings(key,value) values('maint.last',?) on conflict(key) do update set value=excluded.value", args: [JSON.stringify(out)] });
  return NextResponse.json({ ok: true, ...out });
}
