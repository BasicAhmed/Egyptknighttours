import { NextResponse } from "next/server";
import { rateLimit, rateLimitPersistent, clientIp } from "@/lib/rate-limit";
import { feedOwner, feedEvents, viewerFor } from "@/lib/calendar";
import { applyFilters, buildIcs, NO_FILTERS } from "@/lib/calendar-core";
import { getSettings } from "@/lib/settings";
import { linkOrigin } from "@/lib/origin";
import { BOOKING_STATUS_LABEL } from "@/lib/validation";
import { REQUEST_STATUS_LABEL } from "@/lib/corporate-constants";
export const dynamic = "force-dynamic";

// The private calendar feed of one staff member, for "Subscribe" in Google, Apple or Outlook calendar. The link's secret is
// the only key: no cookie is read. A wrong, replaced or switched-off link answers "Not found", exactly like an address
// that never existed. Carries no amount of money and nothing from a passport (see buildIcs).
const gone = () => new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
const slow = () => new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": "600", "Cache-Control": "private, no-store" } });
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/i, "");
  // Two limits. Guesses from one address are counted in the database, so they add up across every server instance. How
  // often one working link is read (a calendar app refreshes a few times an hour) is counted in memory: it only protects
  // this instance from a runaway client and costs no write.
  if (!(await rateLimitPersistent(`calfeed-ip:${clientIp(req.headers)}`, 120, 10 * 60_000))) return slow();
  const who = await feedOwner(token); if (!who) return gone();
  if (!rateLimit(`calfeed:${who.uid}`, 60, 10 * 60_000)) return slow();
  const events = applyFilters(await feedEvents(viewerFor(who)), NO_FILTERS);
  const origin = await linkOrigin(); const g = await getSettings();
  const label = (s: string) => BOOKING_STATUS_LABEL[s] ?? REQUEST_STATUS_LABEL[s] ?? s;
  const ics = buildIcs(events, { name: `${g["company.name"] || "Staff"} calendar`, host: new URL(origin).hostname, statusLabel: label,
    url: (e) => (e.open.type === "order" ? `${origin}/admin?open=${e.open.id}` : e.open.type === "partner" ? `${origin}/admin/corporate/${e.open.id}` : `${origin}/admin/calendar?view=day&date=${e.start}`) });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="calendar.ics"', "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
