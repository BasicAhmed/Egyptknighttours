import { z } from "zod";

// ---------- The calendar, without a database ----------
// Everything the calendar works out is written ONCE here: how a date is moved and compared, which days a month or a week
// shows, how an order lands on its day(s), how a multi-day item is cut into one bar per week row, what the
// filters keep, and the text of the subscription feed (.ics). The page, the feed, the server and the unit tests all read
// this file. No database or server imports.
//
// Dates. Every date in the product is a plain day, "2026-11-14", with no time zone: the travel date staff typed is the day
// the customer travels, wherever the server runs. So nothing here ever goes through a local Date: days are compared as
// text and moved with UTC arithmetic. A time is a wall-clock "HH:MM" at the place of the trip (a pickup at 08:00 is 08:00
// there), kept as text beside its day. "Today" is the one thing that depends on where you are: the page takes it from the
// staff member's own device (see localToday), never from the server's clock.

/** The first day of the week in every calendar view: 1 = Monday (0 would be Sunday). The staff panel writes dates the British way. */
export const WEEK_START: 0 | 1 = 1;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const pad = (n: number) => String(n).padStart(2, "0");
/** A wall-clock time, "08:00" to "23:59". */
export const realTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export const isISO = (v: unknown): v is string => { if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const t = Date.parse(v + "T00:00:00Z"); return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v && v >= "2000-01-01" && v <= "2100-12-31"; };
const ms = (iso: string) => Date.parse(iso + "T00:00:00Z");
export const addDays = (iso: string, n: number) => new Date(ms(iso) + n * 86_400_000).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 86_400_000); // b - a
export const weekday = (iso: string) => new Date(ms(iso)).getUTCDay(); // 0 Sunday … 6 Saturday
export const monthStart = (iso: string) => iso.slice(0, 8) + "01";
export const daysInMonth = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).getUTCDate();
export const monthEnd = (iso: string) => iso.slice(0, 8) + pad(daysInMonth(iso));
/** The same day n months on; the 31st becomes the last day of a shorter month. */
export function addMonths(iso: string, n: number): string {
  const total = Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1 + n; const first = `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`;
  return first.slice(0, 8) + pad(Math.min(Number(iso.slice(8, 10)), daysInMonth(first)));
}
export const weekStart = (iso: string, first: number = WEEK_START) => addDays(iso, -((weekday(iso) - first + 7) % 7));
export const weekDays = (iso: string, first: number = WEEK_START) => { const s = weekStart(iso, first); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };
/** The weeks a month view shows: whole weeks, from the week of the 1st to the week of the last day (4 to 6 rows). */
export function monthGrid(iso: string, first: number = WEEK_START): string[][] {
  const out: string[][] = []; const last = monthEnd(iso);
  for (let d = weekStart(monthStart(iso), first); d <= last; d = addDays(d, 7)) out.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  return out;
}
/** Short weekday names in the order the views use them. */
export const weekdayNames = (first: number = WEEK_START) => Array.from({ length: 7 }, (_, i) => WEEKDAYS[(i + first) % 7]);
/** Today where the staff member is: read from the device's own clock. Only called in the browser. */
export const localToday = (now: Date = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
/** Today on the server (UTC), for what has no device: the feed's window and the first paint before the browser corrects it. */
export const utcToday = (now: number = Date.now()) => new Date(now).toISOString().slice(0, 10);

export const dayNum = (iso: string) => Number(iso.slice(8, 10));
export const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
export const shortMonth = (iso: string) => monthName(iso).slice(0, 3);
export const longDay = (iso: string) => `${WEEKDAYS[weekday(iso)]} ${dayNum(iso)} ${monthName(iso)} ${iso.slice(0, 4)}`;
export const shortDay = (iso: string) => `${WEEKDAYS[weekday(iso)].slice(0, 3)} ${dayNum(iso)} ${shortMonth(iso)}`;

// ---------- views and the range each one shows ----------
export const VIEWS = ["month", "week", "day", "agenda"] as const;
export type View = (typeof VIEWS)[number];
export const isView = (v: unknown): v is View => typeof v === "string" && (VIEWS as readonly string[]).includes(v);
export type Range = { from: string; to: string }; // both days included
export function viewRange(view: View, iso: string): Range {
  if (view === "day") return { from: iso, to: iso };
  if (view === "week") { const d = weekDays(iso); return { from: d[0], to: d[6] }; }
  if (view === "agenda") return { from: monthStart(iso), to: monthEnd(iso) };
  const g = monthGrid(iso); return { from: g[0][0], to: g[g.length - 1][6] };
}
export function viewTitle(view: View, iso: string): string {
  if (view === "day") return `${WEEKDAYS[weekday(iso)].slice(0, 3)} ${dayNum(iso)} ${shortMonth(iso)} ${iso.slice(0, 4)}`;
  if (view === "week") { const d = weekDays(iso), a = d[0], b = d[6]; return a.slice(0, 7) === b.slice(0, 7) ? `${dayNum(a)} to ${dayNum(b)} ${shortMonth(b)} ${b.slice(0, 4)}` : `${dayNum(a)} ${shortMonth(a)} to ${dayNum(b)} ${shortMonth(b)} ${b.slice(0, 4)}`; }
  return `${monthName(iso)} ${iso.slice(0, 4)}`;
}
/** Previous / next in a view: a month, a week or a day at a time. */
export const step = (view: View, iso: string, dir: 1 | -1) => (view === "day" ? addDays(iso, dir) : view === "week" ? addDays(iso, 7 * dir) : addMonths(iso, dir));
/** The data is loaded one month at a time (the month's whole weeks), so moving about never asks for the same days twice. */
export const monthKey = (iso: string) => iso.slice(0, 7);
export const chunkRange = (ym: string): Range => viewRange("month", ym + "-01");
export function monthsCovering(r: Range): string[] {
  const out: string[] = []; for (let d = monthStart(r.from); d <= r.to; d = addMonths(d, 1)) out.push(monthKey(d)); return out;
}
export const MAX_RANGE_DAYS = 62; // the most one feed request may ask for

// ---------- one event ----------
export const KINDS = ["order", "partner", "deadline", "custom"] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = { order: "Orders", partner: "Corporate requests", deadline: "Payment deadlines", custom: "Events" };
export const EVENT_TYPES = ["MEETING", "REMINDER", "TASK", "HOLIDAY", "OTHER"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABEL: Record<EventType, string> = { MEETING: "Meeting", REMINDER: "Reminder", TASK: "Task", HOLIDAY: "Holiday / closed", OTHER: "Other" };
export const canBeDone = (type: string) => type === "TASK" || type === "REMINDER";
export type LinkKind = "order" | "customer";

export type CalEvent = {
  id: string;                 // stable: "o:<order>", "p:<request>:<day>", "d:<order>", "pp:<order>", "c:<event>"
  kind: Kind;
  sub: string;                // order: "TOUR"; custom: MEETING…; deadline: "PAYMENT"; partner: "PARTNER"
  mark: "" | "passport";      // "passport": a flag on an order's travel day, a passport to check
  start: string; end: string; // days, both included
  time: string; endTime: string; // "HH:MM" on the start day, "" = all day
  title: string;              // who: the customer, the other company, the event's own title
  line: string;               // what, in one line
  ref: string;
  status: string;             // the order's or request's own status; "" otherwise
  cancelled: boolean;
  people: number;
  guide: string; guideId: string;
  assignee: string; assigneeId: string;
  open: { type: "order" | "partner" | "custom"; id: string }; // what a tap opens
  money?: string;             // a payment deadline's amount. On the staff screen only: the feed never carries it.
  // custom events
  notes?: string; done?: boolean; canEdit?: boolean; by?: string; link?: { kind: LinkKind; id: string; label: string } | null;
};
export const isAllDay = (e: Pick<CalEvent, "time">) => !e.time;
export const spanDays = (e: Pick<CalEvent, "start" | "end">) => diffDays(e.start, e.end) + 1;
export const overlaps = (e: Pick<CalEvent, "start" | "end">, r: Range) => e.start <= r.to && e.end >= r.from;
export const onDay = (e: Pick<CalEvent, "start" | "end">, iso: string) => e.start <= iso && e.end >= iso;
const KIND_RANK: Record<Kind, number> = { custom: 0, order: 1, partner: 2, deadline: 3 };
/** Reading order inside one day: closed days and all-day items first, then by time, then by kind and name. */
export function compareEvents(a: CalEvent, b: CalEvent): number {
  const ha = a.sub === "HOLIDAY" ? 0 : 1, hb = b.sub === "HOLIDAY" ? 0 : 1; if (ha !== hb) return ha - hb;
  if (!a.time !== !b.time) return a.time ? 1 : -1;
  return a.time.localeCompare(b.time) || KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}
export const eventsOn = (events: CalEvent[], iso: string) => events.filter((e) => onDay(e, iso)).sort(compareEvents);

// ---------- orders: one normaliser, read by the screen and the feed ----------
const firstTime = (v: string | null | undefined) => { const t = String(v ?? "").split("-")[0].trim(); return realTime(t) ? t : ""; };
const secondTime = (v: string | null | undefined) => { const t = String(v ?? "").split("-")[1]?.trim() ?? ""; return realTime(t) ? t : ""; };
export const MAX_SPAN_DAYS = 120; // nothing is drawn longer than this (a mistyped year never paints a whole season)
export const TOUR_MAX_DAYS = 60;  // the longest a tour is taken to be: also how far back the feed looks for a tour still running
export type OrderFacts = {
  id: string; ref: string; status: string; name: string; title: string; travelDate: string; people: number;
  pickupTime?: string | null; guide?: string | null; guideId?: string | null;
  tourDays?: number | null; itineraryDays?: number | null;          // how long the trip runs: its itinerary's days, else the tour's own length
};
/** The day(s) an order is on: from its travel date to its last day (the itinerary's length when the order has one, else the
 *  tour's own number of days; one day when neither is known). The pickup time, when staff entered one, is its time. */
export function orderEvents(o: OrderFacts): CalEvent[] {
  if (!isISO(o.travelDate)) return [];
  const days = Math.min(TOUR_MAX_DAYS, Math.max(1, Math.floor(Number(o.itineraryDays) || Number(o.tourDays) || 1)));
  return [{ id: `o:${o.id}`, kind: "order", sub: "TOUR", mark: "", start: o.travelDate, end: addDays(o.travelDate, days - 1), time: firstTime(o.pickupTime), endTime: secondTime(o.pickupTime), title: o.name, line: o.title, ref: o.ref,
    status: o.status, cancelled: o.status === "CANCELLED", people: o.people, guide: o.guide ?? "", guideId: o.guideId ?? "", assignee: "", assigneeId: "", open: { type: "order", id: o.id } }];
}
/** A passport that runs out within six months of the travel day (the rule the nightly passport check already uses). */
export const passportConcern = (expiry: string, travelDate: string) => isISO(expiry) && isISO(travelDate) && expiry < addMonths(travelDate, 6);

// ---------- filters (kept in the address, so a reload, Back and a shared link show the same thing) ----------
export const STAGES = ["todo", "pay", "paid", "done"] as const;
export type StageKey = (typeof STAGES)[number];
export const STAGE_LABEL: Record<StageKey, string> = { todo: "To do", pay: "Awaiting payment", paid: "Confirmed", done: "Completed" };
const STAGE_OF: Record<string, StageKey> = { INQUIRY: "todo", PENDING: "todo", CONFIRMED: "todo", QUOTE_SENT: "todo", INVOICED: "pay", PARTIALLY_PAID: "pay", DEPOSIT_PAID: "pay", PAID: "paid", COMPLETED: "done" };
export type Filters = { kinds: Kind[]; stage: "" | StageKey; cancelled: boolean; guide: string; assignee: string; q: string };
export const NO_FILTERS: Filters = { kinds: [], stage: "", cancelled: false, guide: "", assignee: "", q: "" };
type Params = { get(k: string): string | null };
const list = (v: string | null) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
export function parseFilters(p: Params): Filters {
  const stage = p.get("stage") ?? "";
  return { kinds: list(p.get("kinds")).filter((k): k is Kind => (KINDS as readonly string[]).includes(k)),
    stage: (STAGES as readonly string[]).includes(stage) ? (stage as StageKey) : "", cancelled: p.get("cancelled") === "1",
    guide: (p.get("guide") ?? "").slice(0, 60), assignee: (p.get("assignee") ?? "").slice(0, 60), q: (p.get("q") ?? "").slice(0, 80) };
}
/** Only what differs from the defaults is written, so an unfiltered calendar has a clean address. */
export function filterParams(f: Filters): [string, string][] {
  const out: [string, string][] = [];
  if (f.kinds.length) out.push(["kinds", f.kinds.join(",")]);
  if (f.stage) out.push(["stage", f.stage]); if (f.cancelled) out.push(["cancelled", "1"]);
  if (f.guide) out.push(["guide", f.guide]); if (f.assignee) out.push(["assignee", f.assignee]); if (f.q.trim()) out.push(["q", f.q.trim()]);
  return out;
}
export const activeFilters = (f: Filters) => filterParams(f).filter(([k]) => k !== "q").length;
/** What the filters keep. Every count on the page is taken AFTER this, so a number always matches what a tap shows.
 *  - kinds: none ticked means all of them. A passport flag belongs to its order (kind order).
 *  - stage narrows the orders; it does not hide corporate requests or events.
 *  - cancelled orders and requests are hidden unless asked for.
 *  - guide narrows to what that guide is on; assignee to the events given to that person.
 *  - q matches the name, the reference and the summary line. */
export function applyFilters(events: CalEvent[], f: Filters): CalEvent[] {
  const needle = f.q.trim().toLowerCase();
  return events.filter((e) => {
    if (f.kinds.length && !f.kinds.includes(e.kind)) return false;
    if (e.cancelled && !f.cancelled) return false;
    if (e.kind === "order" && f.stage && !e.cancelled && STAGE_OF[e.status] !== f.stage) return false;
    if (f.guide && e.guideId !== f.guide) return false;
    if (f.assignee && e.assigneeId !== f.assignee) return false;
    if (needle && !`${e.title} ${e.ref} ${e.line} ${e.guide} ${e.assignee}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}
/** How many events each day of a range has. */
export function dayCounts(events: CalEvent[], r: Range): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) for (let d = e.start < r.from ? r.from : e.start, last = e.end > r.to ? r.to : e.end; d <= last; d = addDays(d, 1)) out[d] = (out[d] ?? 0) + 1;
  return out;
}
/** Days a "Holiday / closed" event covers: drawn shaded. Booking is not changed by it. */
export function closedDays(events: CalEvent[], r: Range): Set<string> {
  const out = new Set<string>();
  for (const e of events) if (e.kind === "custom" && e.sub === "HOLIDAY") for (let d = e.start < r.from ? r.from : e.start, last = e.end > r.to ? r.to : e.end; d <= last; d = addDays(d, 1)) out.add(d);
  return out;
}

// ---------- one week row of a month (and the week view): bars in lanes ----------
export type Bar = { e: CalEvent; col: number; span: number; lane: number; before: boolean; after: boolean }; // before/after: it continues from / into another week
export type WeekLayout = { bars: Bar[]; more: number[]; total: number[] }; // more[i]: events on day i that did not fit; total[i]: all events on day i
/** Cuts every event that touches the week into one bar (first column, columns covered), gives each a lane so none overlap,
 *  and says how many are left over per day when only `maxLanes` rows fit. Longer and earlier items take the upper lanes, so
 *  a trip keeps one unbroken line. When a day has more than fits, its last row is the "+N more" button. */
export function layoutWeek(events: CalEvent[], days: string[], maxLanes: number): WeekLayout {
  const from = days[0], to = days[days.length - 1], n = days.length;
  const inWeek = events.filter((e) => overlaps(e, { from, to })).sort((a, b) => {
    const sa = a.start < from ? from : a.start, sb = b.start < from ? from : b.start; if (sa !== sb) return sa < sb ? -1 : 1;
    const la = spanDays(a), lb = spanDays(b); if (la !== lb) return lb - la;
    return compareEvents(a, b);
  });
  const lanes: boolean[][] = []; const all: Bar[] = []; const total = Array<number>(n).fill(0);
  for (const e of inWeek) {
    const col = Math.max(0, diffDays(from, e.start)), last = Math.min(n - 1, diffDays(from, e.end)), span = last - col + 1;
    let lane = 0; for (;; lane++) { const row = (lanes[lane] ??= Array<boolean>(n).fill(false)); if (!row.slice(col, last + 1).some(Boolean)) { for (let i = col; i <= last; i++) row[i] = true; break; } }
    all.push({ e, col, span, lane, before: e.start < from, after: e.end > to }); for (let i = col; i <= last; i++) total[i]++;
  }
  const overflow = Array.from({ length: n }, (_, i) => all.some((b) => b.lane >= maxLanes && b.col <= i && i < b.col + b.span));
  const fits = (b: Bar) => b.lane < maxLanes - 1 || (b.lane === maxLanes - 1 && !overflow.slice(b.col, b.col + b.span).some(Boolean));
  const bars = maxLanes > 0 ? all.filter(fits) : []; const more = Array<number>(n).fill(0);
  for (const b of all) if (!bars.includes(b)) for (let i = b.col; i < b.col + b.span; i++) more[i]++;
  return { bars, more, total };
}

// ---------- custom events: what staff may type ----------
const text = (max: number) => z.preprocess((v) => (v == null ? "" : String(v)), z.string().trim().max(max));
export const eventSchema = z.object({
  title: text(120).refine((v) => v.length >= 1, "Give the event a title."),
  type: z.enum(EVENT_TYPES, { message: "Choose what kind of event this is." }),
  startDate: z.string().refine(isISO, "Choose a real start date."),
  endDate: z.preprocess((v) => (v == null ? "" : String(v)), z.string().refine((v) => v === "" || isISO(v), "Choose a real end date.")),
  time: z.preprocess((v) => (v == null ? "" : String(v).trim()), z.string().refine((v) => v === "" || realTime(v), "Enter the time like 14:30.")),
  notes: text(1000), linkKind: z.preprocess((v) => (v == null ? "" : String(v)), z.enum(["", "order", "customer"])), linkId: text(60), assigneeId: text(60),
  done: z.preprocess((v) => v === true || v === "true" || v === "on" || v === "1", z.boolean()),
  clientKey: z.preprocess((v) => (v == null ? "" : String(v)), z.string().regex(/^[A-Za-z0-9_-]{0,64}$/)),
}).transform((v) => ({ ...v, endDate: v.endDate || v.startDate }))
  .refine((v) => v.endDate >= v.startDate, { message: "The end date is before the start date.", path: ["endDate"] })
  .refine((v) => diffDays(v.startDate, v.endDate) < 366, { message: "An event can last a year at most.", path: ["endDate"] })
  .transform((v) => ({ ...v, time: v.type === "HOLIDAY" ? "" : v.time, done: canBeDone(v.type) ? v.done : false, linkId: v.linkKind ? v.linkId : "" }));
export type EventInput = z.infer<typeof eventSchema>;
export function parseEvent(raw: unknown): { ok: true; data: EventInput } | { ok: false; message: string } {
  const r = eventSchema.safeParse(raw); return r.success ? { ok: true, data: r.data } : { ok: false, message: r.error.issues[0].message };
}
/** Who may change a custom event: the person who made it, an owner or a manager. */
export const canEditEvent = (user: { uid: string; role: string }, createdById: string | null | undefined) => user.role === "SUPER_ADMIN" || user.role === "MANAGER" || (!!createdById && createdById === user.uid);

// ---------- the subscription feed (.ics, RFC 5545) ----------
// All-day items use VALUE=DATE (the end day is the day AFTER the last one, as the standard says). A timed item is written
// as a "floating" local time with no zone: 08:00 is 08:00 on whatever device opens it, which is what a pickup time means.
// The feed never carries an amount of money or anything from a passport: deadlines say that a payment is due, not how much,
// and passport flags are left out altogether.
export const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
/** Lines are folded at 75 octets (not characters): a letter that takes several bytes is never cut in half. */
export function icsFold(line: string): string {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line;
  const out: string[] = []; let cur = "", size = 0;
  for (const ch of line) { const n = enc.encode(ch).length, limit = out.length ? 74 : 75; if (size + n > limit) { out.push(cur); cur = ""; size = 0; } cur += ch; size += n; }
  out.push(cur); return out.map((x, i) => (i ? " " + x : x)).join("\r\n");
}
const icsDate = (iso: string) => iso.replace(/-/g, "");
const icsTime = (iso: string, hm: string) => `${icsDate(iso)}T${hm.replace(":", "")}00`;
const plusHour = (iso: string, hm: string) => { const m = Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)) + 60; const day = m >= 1440 ? addDays(iso, 1) : iso; return icsTime(day, `${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}`); };
export const ICS_KIND_WORD: Record<Kind, string> = { order: "Order", partner: "Corporate request", deadline: "Payment due", custom: "Event" };
/** The summary line of one event in a phone's calendar. */
export function icsSummary(e: CalEvent, statusLabel: (s: string) => string = (s) => s): string {
  const time = e.time && spanDays(e) > 1 ? ` (${e.time})` : "";
  if (e.kind === "custom") return `${e.done ? "✓ " : ""}${e.title}`;

  if (e.kind === "partner") return `Corporate: ${e.title}${e.line ? `, ${e.line}` : ""}`;
  if (e.kind === "deadline") return `Payment due: ${e.title} (${e.ref})`;
  const what = e.line && e.line !== e.title ? `, ${e.line}` : "";
  return `${e.cancelled ? `${statusLabel(e.status)}: ` : ""}${e.title}${what}${time}`;
}
export type IcsOptions = { name: string; host: string; now?: number; url?: (e: CalEvent) => string; statusLabel?: (s: string) => string };
export function buildIcs(events: CalEvent[], o: IcsOptions): string {
  const stamp = new Date(o.now ?? Date.now()).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const host = o.host.replace(/[^A-Za-z0-9.-]/g, "") || "calendar"; const label = o.statusLabel ?? ((s: string) => s);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Egypt Knight Tours//Staff calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(o.name)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const e of events) {
    if (e.mark === "passport") continue; // nothing from a passport leaves the staff panel
    const timed = !!e.time && spanDays(e) === 1;
    const facts = [e.ref && `Reference: ${e.ref}`, e.kind === "order" && e.line && e.line !== e.title ? e.line : "", e.status && e.kind !== "custom" ? `Status: ${label(e.status)}` : "", e.people ? `People: ${e.people}` : "", e.time && !timed ? `Time: ${e.time}${e.endTime ? ` to ${e.endTime}` : ""}` : "",
      e.guide && `Guide: ${e.guide}`, e.assignee && `Assigned to: ${e.assignee}`, e.kind === "custom" && e.link ? `Linked to: ${e.link.label}` : "", e.kind === "custom" ? e.notes ?? "" : ""].filter(Boolean).join("\n");
    const url = o.url?.(e) ?? "";
    lines.push("BEGIN:VEVENT", `UID:${e.id.replace(/[^A-Za-z0-9:_-]/g, "")}@${host}`, `DTSTAMP:${stamp}`,
      ...(timed ? [`DTSTART:${icsTime(e.start, e.time)}`, `DTEND:${e.endTime && e.endTime > e.time ? icsTime(e.start, e.endTime) : plusHour(e.start, e.time)}`] : [`DTSTART;VALUE=DATE:${icsDate(e.start)}`, `DTEND;VALUE=DATE:${icsDate(addDays(e.end, 1))}`]),
      `SUMMARY:${icsEscape(icsSummary(e, label))}`, ...(facts ? [`DESCRIPTION:${icsEscape(facts)}`] : []), ...(url ? [`URL:${url}`] : []),
      `CATEGORIES:${icsEscape(ICS_KIND_WORD[e.kind])}`, ...(e.cancelled ? ["STATUS:CANCELLED"] : []), ...(e.kind !== "order" ? ["TRANSP:TRANSPARENT"] : []), "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
/** The feed covers last month to a year ahead. */
export const feedWindow = (today: string): Range => ({ from: addMonths(monthStart(today), -1), to: monthEnd(addMonths(monthStart(today), 12)) });
