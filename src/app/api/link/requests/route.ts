// For The Royal Nile Residence (signed requests only): it books Egypt Knight tours/services for its guests. Each one
// becomes an ordinary partner request in Admin → Corporate (company "The Royal Nile Residence"), priced and handled by
// the Egypt Knight team as usual. GET returns the live status of the requests it sent.
import { randomUUID } from "node:crypto";
import { client } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { readLinked } from "@/lib/link";
import { SERVICE_TYPES, SERVICE_TYPE_LABEL, REQUEST_STATUS_LABEL, SERVICE_STATUS_LABEL, requestTotals } from "@/lib/corporate-constants";

export const dynamic = "force-dynamic";
const COMPANY = "The Royal Nile Residence";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clip = (x: unknown, max: number) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

export async function GET(req: Request) {
  const r = await readLinked(req); if (!r.ok) return r.res;
  await ensureDatabase();
  const refs = (new URL(req.url).searchParams.get("refs") ?? "").split(",").map((x) => x.trim()).filter((x) => /^CR-[\w-]{1,20}$/.test(x)).slice(0, 100);
  if (!refs.length) return Response.json({ requests: [] });
  const marks = refs.map(() => "?").join(",");
  // Only requests this link created can be read (company name check), never other partners' requests.
  const reqs = (await client.execute({ sql: `SELECT id, ref, status, currency, pricing_mode, service_percent FROM corporate_requests WHERE ref IN (${marks}) AND company_name = ?`, args: [...refs, COMPANY] })).rows;
  const ids = reqs.map((x) => String(x.id));
  const svcs = ids.length ? (await client.execute({ sql: `SELECT request_id, type, label, date, time, people, status, cost, price, price_unit FROM corporate_services WHERE request_id IN (${ids.map(() => "?").join(",")}) ORDER BY created_at`, args: ids })).rows : [];
  return Response.json({ requests: reqs.map((q) => {
    const mine = svcs.filter((s) => String(s.request_id) === String(q.id));
    const t = requestTotals(mine.map((s) => ({ cost: Number(s.cost), price: Number(s.price), status: String(s.status), priceUnit: String(s.price_unit), people: s.people == null ? null : Number(s.people) })), String(q.pricing_mode), q.service_percent == null ? null : Number(q.service_percent));
    return { ref: String(q.ref), status: String(q.status), statusLabel: REQUEST_STATUS_LABEL[String(q.status)] ?? String(q.status), currency: String(q.currency), priceTotal: t.price,
      services: mine.map((s) => ({ label: String(s.label) || SERVICE_TYPE_LABEL[String(s.type)] || String(s.type), type: String(s.type), date: s.date == null ? null : String(s.date), time: s.time == null ? null : String(s.time), people: s.people == null ? null : Number(s.people), status: String(s.status), statusLabel: SERVICE_STATUS_LABEL[String(s.status)] ?? String(s.status) })) };
  }) });
}

export async function POST(req: Request) {
  const r = await readLinked(req); if (!r.ok) return r.res;
  await ensureDatabase();
  const b = r.body; const it = (b.item ?? {}) as Record<string, unknown>;
  const date = clip(it.date, 10); if (!ISO.test(date)) return Response.json({ error: "Choose the day of the service." }, { status: 400 });
  const people = Math.max(1, Math.min(50, Math.floor(Number(it.people) || 1)));
  let type = clip(it.type, 30).toUpperCase(); if (!SERVICE_TYPES.some(([k]) => k === type)) type = "OTHER";
  let label = clip(it.label, 160), price = 0, unit = "TOTAL";
  const tourId = clip(it.tourId, 60);
  if (tourId) {
    const t = (await client.execute({ sql: "SELECT title, price, discount_price, pricing_model FROM tours WHERE id = ? AND status = 'PUBLISHED'", args: [tourId] })).rows[0];
    if (!t) return Response.json({ error: "That tour is no longer available at Egypt Knight." }, { status: 400 });
    type = "OTHER"; label = `Tour: ${String(t.title)}${label ? ` — ${label}` : ""}`.slice(0, 160);
    // Starting price = Egypt Knight's public price; the team can change it on the request.
    price = Number(t.discount_price ?? t.price ?? 0); unit = String(t.pricing_model) === "PER_GROUP" ? "TOTAL" : "PER_PERSON";
  }
  if (!label) label = SERVICE_TYPE_LABEL[type] ?? "Service";
  const bookingRef = clip(b.bookingRef, 20), guest = clip(b.guestName, 120), staff = clip(b.staffName, 80);
  let ref = "";
  for (let i = 0; i < 8 && !ref; i++) {
    const c = `CR-${1000 + Math.floor(Math.random() * 9000)}`;
    if (!(await client.execute({ sql: "SELECT 1 FROM corporate_requests WHERE ref = ?", args: [c] })).rows.length) ref = c;
  }
  if (!ref) ref = `CR-${Date.now()}`;
  const id = randomUUID();
  const notes = [`Sent from The Royal Nile Residence admin${staff ? ` by ${staff}` : ""} for their booking ${bookingRef}.`, b.checkIn && b.checkOut ? `Guest staying at the residence ${clip(b.checkIn, 10)} → ${clip(b.checkOut, 10)}.` : "", clip(b.notes, 1000)].filter(Boolean).join("\n");
  await client.batch([
    { sql: `INSERT INTO corporate_requests (id, ref, company_name, company_contact, company_phone, customer_name, customer_contact, customer_count, service_date, location, notes, requirements, status, currency, pricing_mode)
            VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, 'Aswan — pickup at The Royal Nile Residence', ?, ?, 'NEW', 'USD', 'ITEMIZED')`,
      args: [id, ref, COMPANY, staff, guest, clip(b.guestPhone, 40), Math.max(people, Math.floor(Number(b.guests) || 0)) || people, date, notes, `Residence booking ${bookingRef}`] },
    { sql: `INSERT INTO corporate_services (id, request_id, type, label, date, time, location, people, cost, price, price_unit, status) VALUES (?, ?, ?, ?, ?, ?, 'The Royal Nile Residence, Aswan', ?, 0, ?, ?, 'PENDING')`,
      args: [randomUUID(), id, type, label, date, clip(it.time, 10) || null, people, price, unit] },
    { sql: "INSERT INTO corporate_events (id, request_id, type, note, user_id, user_name) VALUES (?, ?, 'CREATED', ?, NULL, ?)", args: [randomUUID(), id, `${ref} sent by The Royal Nile Residence (booking ${bookingRef})`, staff ? `${staff} (Royal Nile)` : "Royal Nile Residence"] },
  ], "write");
  return Response.json({ ok: true, ref, label });
}
