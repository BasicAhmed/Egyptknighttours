import { headers } from "next/headers";
import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff, PERMS } from "@/lib/auth";
import { calendarFeed, feedStatus, viewerFor } from "@/lib/calendar";
import { chunkRange, isISO, isView, monthKey, parseFilters, utcToday, viewRange } from "@/lib/calendar-core";
import CalendarBoard from "@/components/calendar/CalendarBoard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar" };

// Orders, corporate requests, payment deadlines and the team's own events on their real dates.
// For everyone who can open the Orders list. What each person sees on it follows their role (viewerFor): corporate
// requests for the roles that handle them, payment deadlines for the finance roles only.
export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const u = await requireStaff(); const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const vq = one("view"); const view = isView(vq) ? vq : null; const date = isISO(one("date")) ? one("date") : null;
  const filters = parseFilters({ get: one });
  // A first guess at the screen (the browser corrects it at once if it is wrong): a phone opens on the agenda, a desk on the month.
  const phone = /Mobi|Android|iPhone|iPod/i.test((await headers()).get("user-agent") ?? "");
  const today = utcToday(); const day = date ?? today; const v = view ?? (phone ? "agenda" : "month");
  const month = monthKey(v === "week" ? viewRange("week", day).from : day);
  const viewer = viewerFor(u);
  const [events, guides, staff, tours, feed] = await Promise.all([
    calendarFeed(chunkRange(month), viewer, { cancelled: filters.cancelled }),
    db.select({ id: s.tourGuides.id, name: s.tourGuides.name }).from(s.tourGuides).where(eq(s.tourGuides.active, true)).orderBy(asc(s.tourGuides.name)),
    db.select({ id: s.users.id, name: s.users.name }).from(s.users).orderBy(asc(s.users.name)),
    db.select({ id: s.tours.id, title: s.tours.title }).from(s.tours).where(and(eq(s.tours.status, "PUBLISHED"), ne(s.tours.slug, "custom-experience"))).orderBy(asc(s.tours.title)),
    feedStatus(u.uid),
  ]);
  return <CalendarBoard initial={[{ month, cancelled: filters.cancelled, events }]} view={view} date={date} filters={filters} serverToday={today} phoneGuess={phone}
    me={{ uid: u.uid, name: u.name }} can={{ orders: PERMS.bookings.includes(u.role), finance: PERMS.finance.includes(u.role), partner: viewer.partner, deadlines: viewer.deadlines }}
    guides={guides} staff={staff} tours={tours} feed={feed} />;
}
