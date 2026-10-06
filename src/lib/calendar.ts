import { createHash, randomBytes } from "node:crypto";
import { client } from "@/db";
import { INVOICE_DEADLINE } from "@/db/calendar-indexes";
import { PERMS } from "./auth";
import { isPrepaid } from "./order-rules";
import { SERVICE_TYPE_LABEL } from "./corporate-constants";
import { addDays, diffDays, canEditEvent, isISO, orderEvents, overlaps, passportConcern, parseEvent, canBeDone, compareEvents, feedWindow, utcToday, realTime, TOUR_MAX_DAYS, type CalEvent, type EventInput, type LinkKind, type Range } from "./calendar-core";

// ---------- The calendar's data ----------
// calendarFeed() is the ONE place that turns the company's real records into calendar events for a range of days. The
// calendar page, the JSON the page asks for when you move to another month, and the subscription feed (.ics) all call it,
// so they can never disagree. Nothing is copied into a calendar table: orders, corporate requests and invoice deadlines
// are read from their own tables each time, and only staff's own entries live in calendar_events.
// Every query is bounded by the range and reads through an index (see the notes on each one); none loads "all orders".

type Row = Record<string, unknown>;
const S = (v: unknown) => (v == null ? "" : String(v)); const N = (v: unknown) => Number(v ?? 0) || 0;
const rows = async (sql: string, args: (string | number)[] = []) => (await client.execute({ sql, args })).rows as unknown as Row[];
const marks = (n: number) => Array.from({ length: n }, () => "?").join(",");
const money = (n: number, currency: string) => { try { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); } catch { return `${n.toFixed(2)} ${currency}`; } };

// What this staff member may see on the calendar. Orders are for everyone who can open the Orders list (every signed-in
// role). Corporate requests follow their own roles; payment deadlines are for the finance roles; passport flags for the
// people who handle bookings.
export type Viewer = { uid: string; role: string; partner: boolean; deadlines: boolean; passports: boolean };
export const viewerFor = (u: { uid: string; role: string }): Viewer => ({ uid: u.uid, role: u.role, partner: PERMS.corporate.includes(u.role), deadlines: PERMS.finance.includes(u.role), passports: PERMS.bookings.includes(u.role) });

// How long a trip runs: the days of the order's own itinerary when it has one (the same rule the itinerary PDF uses:
// its stated length, else the number of days written), else the tour's own number of days.
const ORDER_COLS = `b.id, b.ref, b.status, b.travel_date as travelDate, (b.adults + b.children + b.infants) as people, b.pickup_time as pickupTime, b.guide_id as guideId,
  coalesce(nullif(b.guest_name, ''), c.name) as name, coalesce(nullif(b.title_override, ''), t.title) as title, t.duration_days as tourDays,
  (select g.name from tour_guides g where g.id = b.guide_id) as guide,
  (select case when json_valid(i.content) then coalesce(nullif(json_extract(i.content, '$.durationDays'), 0), json_array_length(i.content, '$.days')) end from itineraries i where i.booking_id = b.id and i.is_template = 0 order by i.updated_at desc limit 1) as itineraryDays
  from bookings b join customers c on c.id = b.customer_id join tours t on t.id = b.tour_id`;

export type FeedOptions = { cancelled?: boolean };
export async function calendarFeed(range: Range, viewer: Viewer, o: FeedOptions = {}): Promise<CalEvent[]> {
  const { from, to } = range; if (!isISO(from) || !isISO(to) || to < from) return [];
  const live = o.cancelled ? "" : " and b.status != 'CANCELLED'";
  const out: CalEvent[] = [];

  // ----- orders: every order whose trip touches the range. A trip can have started up to TOUR_MAX_DAYS before the range
  // and still be running in it, so the query looks that far back and keeps what overlaps. Index: bookings_travel_idx. -----
  const flagged: { id: string; name: string; day: string; ref: string; status: string }[] = [];
  for (const r of await rows(`select ${ORDER_COLS} where b.travel_date between ? and ?${live}`, [addDays(from, -(TOUR_MAX_DAYS - 1)), to])) {
    const evs = orderEvents({ id: S(r.id), ref: S(r.ref), status: S(r.status), name: S(r.name), title: S(r.title), travelDate: S(r.travelDate), people: N(r.people), pickupTime: S(r.pickupTime), guide: S(r.guide), guideId: S(r.guideId), tourDays: N(r.tourDays), itineraryDays: N(r.itineraryDays) }).filter((e) => overlaps(e, range));
    out.push(...evs);
    if (viewer.passports && evs[0] && evs[0].start >= from && !["CANCELLED", "COMPLETED"].includes(S(r.status))) flagged.push({ id: S(r.id), name: S(r.name), day: evs[0].start, ref: S(r.ref), status: S(r.status) });
  }
  // ----- passports that run out too close to travel: an all-day flag on the travel day (index: travelers_booking_idx) -----
  for (let i = 0; i < flagged.length; i += 400) {
    const part = flagged.slice(i, i + 400); const byId = new Map(part.map((f) => [f.id, f])); const count = new Map<string, number>();
    for (const t of await rows(`select booking_id as id, passport_expiry as expiry from travelers where booking_id in (${marks(part.length)}) and passport_expiry is not null and passport_expiry != ''`, part.map((f) => f.id))) { const f = byId.get(S(t.id)); if (f && passportConcern(S(t.expiry), f.day)) count.set(f.id, (count.get(f.id) ?? 0) + 1); }
    for (const [id, n] of count) { const f = byId.get(id)!; out.push({ id: `pp:${id}`, kind: "order", sub: "TOUR", mark: "passport", start: f.day, end: f.day, time: "", endTime: "", title: f.name, line: `Passport check: ${n} passport${n === 1 ? " runs" : "s run"} out within 6 months of travel`, ref: f.ref, status: f.status, cancelled: false, people: n, guide: "", guideId: "", assignee: "", assigneeId: "", open: { type: "order", id } }); }
  }

  // ----- corporate requests: one item per request per day, with that day's services (indexes: corporate_*_date_idx) -----
  if (viewer.partner) {
    const dead = o.cancelled ? "" : " and r.status != 'CANCELLED'";
    const reqs = await rows(`select r.id, r.ref, r.company_name as company, r.customer_name as customer, r.customer_count as people, r.service_date as day, r.status, r.location from corporate_requests r where r.service_date between ? and ?${dead}`, [from, to]);
    const svcs = await rows(`select s.request_id as id, s.type, s.label, s.date as day, s.time, r.ref, r.company_name as company, r.customer_name as customer, r.customer_count as people, r.status, r.location from corporate_services s join corporate_requests r on r.id = s.request_id
      where s.date between ? and ? and s.status != 'CANCELLED'${dead} order by s.date, s.time`, [from, to]);
    const days = new Map<string, { r: Row; day: string; services: Row[] }>();
    for (const r of reqs) if (isISO(S(r.day))) days.set(`${S(r.id)}:${S(r.day)}`, { r, day: S(r.day), services: [] });
    for (const sv of svcs) { if (!isISO(S(sv.day))) continue; const k = `${S(sv.id)}:${S(sv.day)}`; const d = days.get(k) ?? { r: sv, day: S(sv.day), services: [] }; d.services.push(sv); days.set(k, d); }
    for (const [k, d] of days) {
      const times = d.services.map((x) => S(x.time)).filter(realTime).sort();
      const what = d.services.map((x) => `${S(x.label) || SERVICE_TYPE_LABEL[S(x.type)] || S(x.type)}${S(x.time) ? ` ${S(x.time)}` : ""}`).join(", ");
      out.push({ id: `p:${k}`, kind: "partner", sub: "PARTNER", mark: "", start: d.day, end: d.day, time: times[0] ?? "", endTime: "", title: S(d.r.company), line: what || [S(d.r.customer), S(d.r.location)].filter(Boolean).join(", ") || "Service day",
        ref: S(d.r.ref), status: S(d.r.status), cancelled: S(d.r.status) === "CANCELLED", people: N(d.r.people), guide: "", guideId: "", assignee: "", assigneeId: "", open: { type: "partner", id: k.slice(0, k.lastIndexOf(":")) } });
    }
  }

  // ----- money: the deadline on an order's LATEST invoice, while something is still to pay (index: documents_cal_deadline_idx) -----
  // Never for an order a marketplace already collected (Viator), never for a paid, completed or cancelled order.
  if (viewer.deadlines) {
    const due = await rows(`select d.id as docId, ${INVOICE_DEADLINE} as day, d.number, d.currency as invCurrency, b.id, b.ref, b.status, b.source, b.total, b.currency,
      coalesce(nullif(b.guest_name, ''), c.name) as name,
      (select coalesce(sum(p.amount), 0) from payments p where p.booking_id = b.id and p.status = 'PAID') as paid,
      (select coalesce(sum(json_extract(x.value, '$.amount')), 0) from json_each(d.data, '$.extras') x) as extras
      from documents d join bookings b on b.id = d.booking_id join customers c on c.id = b.customer_id
      where d.kind = 'INVOICE' and ${INVOICE_DEADLINE} between ? and ? and b.status not in ('PAID', 'COMPLETED', 'CANCELLED')
        and not exists (select 1 from documents n where n.booking_id = d.booking_id and n.kind = 'INVOICE' and (n.version > d.version or (n.version = d.version and n.created_at > d.created_at)))`, [from, to]);
    for (const r of due) {
      if (isPrepaid(S(r.source)) || !isISO(S(r.day))) continue;
      const owed = Math.max(0, N(r.total) + (S(r.invCurrency) === S(r.currency) ? N(r.extras) : 0)), balance = Math.round((owed - N(r.paid)) * 100) / 100; if (balance <= 0.005) continue;
      out.push({ id: `d:${S(r.id)}`, kind: "deadline", sub: "PAYMENT", mark: "", start: S(r.day), end: S(r.day), time: "", endTime: "", title: S(r.name), line: `Payment due, invoice ${S(r.number)}`, ref: S(r.ref), status: S(r.status), cancelled: false, people: 0,
        guide: "", guideId: "", assignee: "", assigneeId: "", open: { type: "order", id: S(r.id) }, money: `${money(balance, S(r.currency))} still to pay` });
    }
  }

  // ----- staff's own events (indexes: calendar_events_start_idx, calendar_events_end_idx) -----
  for (const r of await rows(`select e.*, (select name from users u where u.id = e.assignee_id) as assignee, (select name from users u where u.id = e.created_by_id) as author from calendar_events e where e.start_date <= ? and e.end_date >= ?`, [to, from])) out.push(customEvent(r, viewer));

  return out.sort((a, b) => (a.start === b.start ? compareEvents(a, b) : a.start < b.start ? -1 : 1));
}
function customEvent(r: Row, viewer: { uid: string; role: string }): CalEvent {
  const kind = S(r.link_kind) as LinkKind | "";
  return { id: `c:${S(r.id)}`, kind: "custom", sub: S(r.type), mark: "", start: S(r.start_date), end: S(r.end_date) < S(r.start_date) ? S(r.start_date) : S(r.end_date), time: S(r.time), endTime: "", title: S(r.title), line: "", ref: "", status: "", cancelled: false, people: 0,
    guide: "", guideId: "", assignee: S(r.assignee), assigneeId: S(r.assignee) ? S(r.assignee_id) : "", open: { type: "custom", id: S(r.id) }, notes: S(r.notes), done: !!N(r.done), canEdit: canEditEvent(viewer, S(r.created_by_id)), by: S(r.author),
    link: kind && S(r.link_id) ? { kind, id: S(r.link_id), label: S(r.link_label) } : null };
}

// ---------- staff's own events: create, change, move, tick off, delete ----------
export type SaveResult = { ok: true; event: CalEvent; duplicate?: boolean } | { ok: false; message: string };
const audit = (userId: string, action: string, id: string) => client.execute({ sql: "insert into audit_logs (id, user_id, action, entity, entity_id, created_at) values (?, ?, ?, 'calendar_event', ?, unixepoch())", args: [crypto.randomUUID(), userId, action, id] });
const oneEvent = async (id: string, viewer: { uid: string; role: string }) => { const [r] = await rows(`select e.*, (select name from users u where u.id = e.assignee_id) as assignee, (select name from users u where u.id = e.created_by_id) as author from calendar_events e where e.id = ?`, [id]); return r ? { row: r, event: customEvent(r, viewer) } : null; };
// What a link points at must exist (and be something this person may see); its label is read here, never taken from the form.
async function linkLabel(kind: string, id: string, viewer: Viewer): Promise<string | null> {
  if (!kind) return "";
  if (kind === "order") { const [r] = await rows("select b.ref, coalesce(nullif(b.guest_name, ''), c.name) as name from bookings b join customers c on c.id = b.customer_id where b.id = ?", [id]); return r ? `${S(r.ref)}, ${S(r.name)}` : null; }
  if (kind === "customer") { const [r] = await rows("select name from customers where id = ?", [id]); return r ? S(r.name) : null; }
  return null;
}
export async function saveEvent(viewer: Viewer, id: string | null, raw: unknown): Promise<SaveResult> {
  const p = parseEvent(raw); if (!p.ok) return p; const d: EventInput = p.data;
  if (d.assigneeId && !(await rows("select 1 from users where id = ?", [d.assigneeId])).length) return { ok: false, message: "That staff member no longer has an account. Choose someone else." };
  const label = await linkLabel(d.linkKind, d.linkId, viewer); if (label === null || (d.linkKind && !d.linkId)) return { ok: false, message: "What this event was linked to could not be found. Choose it again, or remove the link." };
  const done = d.done ? 1 : 0;
  if (id) {
    const cur = await oneEvent(id, viewer); if (!cur) return { ok: false, message: "This event no longer exists. Someone may have deleted it." };
    if (!cur.event.canEdit) return { ok: false, message: "Only the person who added this event, an owner or a manager can change it." };
    await client.execute({ sql: "update calendar_events set title = ?, type = ?, start_date = ?, end_date = ?, time = ?, notes = ?, link_kind = ?, link_id = ?, link_label = ?, assignee_id = ?, done = ?, done_at = case when ? = 1 then coalesce(done_at, unixepoch()) else null end, updated_at = unixepoch() where id = ?",
      args: [d.title, d.type, d.startDate, d.endDate, d.time || null, d.notes, d.linkKind || null, d.linkId || null, label, d.assigneeId || null, done, done, id] });
    await audit(viewer.uid, "UPDATE", id);
    return { ok: true, event: (await oneEvent(id, viewer))!.event };
  }
  // New: the form's own key makes a second send of the same form (a double tap, a retry on a slow line) the same event.
  const newId = crypto.randomUUID(); const key = d.clientKey || null;
  const res = await client.execute({ sql: "insert into calendar_events (id, title, type, start_date, end_date, time, notes, link_kind, link_id, link_label, assignee_id, done, done_at, created_by_id, client_key, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, case when ? = 1 then unixepoch() end, ?, ?, unixepoch(), unixepoch()) on conflict (client_key) do nothing",
    args: [newId, d.title, d.type, d.startDate, d.endDate, d.time || null, d.notes, d.linkKind || null, d.linkId || null, label, d.assigneeId || null, done, done, viewer.uid, key] });
  if (!res.rowsAffected) { const [ex] = key ? await rows("select id from calendar_events where client_key = ?", [key]) : []; const have = ex ? await oneEvent(S(ex.id), viewer) : null; return have ? { ok: true, event: have.event, duplicate: true } : { ok: false, message: "The event could not be saved. Please try again." }; }
  await audit(viewer.uid, "CREATE", newId);
  return { ok: true, event: (await oneEvent(newId, viewer))!.event };
}
// Moving keeps the event's length: only its first day changes. For staff's own events only: an order's date is never
// changed from the calendar (that has a price and an email to the customer behind it).
export async function moveEvent(viewer: Viewer, id: string, start: string): Promise<SaveResult> {
  if (!isISO(start)) return { ok: false, message: "That is not a real date." };
  const cur = await oneEvent(id, viewer); if (!cur) return { ok: false, message: "This event no longer exists." };
  if (!cur.event.canEdit) return { ok: false, message: "Only the person who added this event, an owner or a manager can move it." };
  const len = Math.max(0, diffDays(cur.event.start, cur.event.end));
  if (start !== cur.event.start) { await client.execute({ sql: "update calendar_events set start_date = ?, end_date = ?, updated_at = unixepoch() where id = ?", args: [start, addDays(start, len), id] }); await audit(viewer.uid, "MOVE", id); }
  return { ok: true, event: (await oneEvent(id, viewer))!.event };
}
export async function setEventDone(viewer: Viewer, id: string, done: boolean): Promise<SaveResult> {
  const cur = await oneEvent(id, viewer); if (!cur) return { ok: false, message: "This event no longer exists." };
  // Ticking a task off is for whoever may change it, and for the person it was given to.
  if (!cur.event.canEdit && cur.event.assigneeId !== viewer.uid) return { ok: false, message: "Only the person who added this, the person it is assigned to, an owner or a manager can tick it off." };
  if (!canBeDone(cur.event.sub)) return { ok: false, message: "Only a task or a reminder can be marked done." };
  if (!!cur.event.done !== done) { await client.execute({ sql: "update calendar_events set done = ?, done_at = case when ? = 1 then unixepoch() end, updated_at = unixepoch() where id = ?", args: [done ? 1 : 0, done ? 1 : 0, id] }); await audit(viewer.uid, done ? "DONE" : "REOPEN", id); }
  return { ok: true, event: (await oneEvent(id, viewer))!.event };
}
export async function deleteEvent(viewer: Viewer, id: string): Promise<{ ok: boolean; message: string }> {
  const cur = await oneEvent(id, viewer); if (!cur) return { ok: true, message: "Already deleted." };
  if (!cur.event.canEdit) return { ok: false, message: "Only the person who added this event, an owner or a manager can delete it." };
  const res = await client.execute({ sql: "delete from calendar_events where id = ?", args: [id] });
  if (res.rowsAffected) await audit(viewer.uid, "DELETE", id);
  return { ok: true, message: "Event deleted." };
}

// What an event can be linked to, found by a few typed letters: orders (reference or name) and customers.
export type LinkHit = { kind: LinkKind; id: string; label: string };
export async function searchLinks(viewer: Viewer, q: string): Promise<LinkHit[]> {
  const needle = q.trim().slice(0, 60); if (needle.length < 2) return [];
  const like = `%${needle.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
  const out: LinkHit[] = [];
  for (const r of await rows("select b.id, b.ref, coalesce(nullif(b.guest_name, ''), c.name) as name, b.travel_date as day from bookings b join customers c on c.id = b.customer_id where b.ref like ? escape '\\' or b.guest_name like ? escape '\\' or c.name like ? escape '\\' order by b.created_at desc limit 6", [like, like, like])) out.push({ kind: "order", id: S(r.id), label: `${S(r.ref)}, ${S(r.name)}` });
  for (const r of await rows("select id, name from customers where name like ? escape '\\' order by created_at desc limit 4", [like])) out.push({ kind: "customer", id: S(r.id), label: S(r.name) });
  return out;
}
// A customer link opens that customer's most recent order (there is no customer page: a customer lives in their orders).
export async function latestOrderOf(customerId: string): Promise<string | null> { const [r] = await rows("select id from bookings where customer_id = ? order by created_at desc limit 1", [customerId]); return r ? S(r.id) : null; }

// ---------- the private subscription link ----------
// A long random secret, shown once. Only its SHA-256 is stored, so nobody reading the database can subscribe as someone
// else. One link per staff member: making a new one replaces (and so switches off) the old one.
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const FEED_TOKEN = /^[A-Za-z0-9_-]{40,64}$/;
export async function feedStatus(uid: string): Promise<{ active: boolean; createdAt: number | null; lastUsedAt: number | null }> {
  const [r] = await rows("select created_at, last_used_at from calendar_feeds where user_id = ?", [uid]);
  return r ? { active: true, createdAt: N(r.created_at) * 1000, lastUsedAt: r.last_used_at == null ? null : N(r.last_used_at) * 1000 } : { active: false, createdAt: null, lastUsedAt: null };
}
export async function createFeed(uid: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await client.execute({ sql: "insert into calendar_feeds (id, user_id, token_hash, created_at, last_used_at) values (?, ?, ?, unixepoch(), null) on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = excluded.created_at, last_used_at = null", args: [crypto.randomUUID(), uid, hashToken(token)] });
  return token;
}
export async function revokeFeed(uid: string) { await client.execute({ sql: "delete from calendar_feeds where user_id = ?", args: [uid] }); }
// Who a link belongs to. The account is read at that moment: a removed account's link stops working at once, and a
// changed role changes what the feed shows from the next refresh.
export async function feedOwner(token: string): Promise<{ uid: string; role: string; name: string } | null> {
  if (!FEED_TOKEN.test(token)) return null;
  const [r] = await rows("select u.id, u.role, u.name, f.id as feedId, f.last_used_at as used from calendar_feeds f join users u on u.id = f.user_id where f.token_hash = ?", [hashToken(token)]);
  if (!r) return null;
  if (r.used == null || N(r.used) < Date.now() / 1000 - 600) await client.execute({ sql: "update calendar_feeds set last_used_at = unixepoch() where id = ?", args: [S(r.feedId)] }).catch(() => {});
  return { uid: S(r.id), role: S(r.role), name: S(r.name) };
}
/** What a subscribed calendar gets: the same events this person sees on the page, for last month to a year ahead. */
export const feedEvents = async (viewer: Viewer, now = Date.now()) => calendarFeed(feedWindow(utcToday(now)), viewer, { cancelled: false });
