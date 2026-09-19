import { db, schema as s } from "../../../db";
import { desc, eq } from "drizzle-orm";
import { requireStaff, PERMS } from "../../../lib/auth";
import Link from "next/link";
import { BOOKING_STATUS, BOOKING_STATUS_LABEL } from "../../../lib/validation";
import { setBooking } from "../actions";
import { money } from "../../../lib/format";
export const dynamic = "force-dynamic";
export default async function Bookings() {
  const u = await requireStaff(); const can = PERMS.bookings.includes(u.role);
  const rows = await db.select({ b: s.bookings, tour: s.tours.title, c: s.customers }).from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).orderBy(desc(s.bookings.createdAt)).limit(100);
  return <div><h1 className="h2">Bookings</h1>
    <div className="mt-4 space-y-3">{rows.map(({ b, tour, c }) => <div key={b.id} className="card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{b.ref} · {tour}</p><span className="flex items-center gap-2"><span className="badge">{BOOKING_STATUS_LABEL[b.status] ?? b.status}</span><Link href={`/admin/bookings/${b.id}`} className="btn btn-dark !min-h-[38px] !py-1.5">Open · documents</Link></span></div>
      <p className="mt-1 text-ink/70">{b.travelDate} · {b.adults}A {b.children}C {b.infants}I · {b.isPrivate ? "Private" : "Shared"} · {money(b.total)} (deposit {money(b.deposit)}, {b.payMode})</p>
      <p className="text-ink/70">{c.name} · {c.email} · {c.whatsapp} · pickup: {b.hotel ?? "not given"}</p>{b.specialRequests && <p className="text-ink/70">Requests: {b.specialRequests}</p>}
      {can && <form action={setBooking.bind(null, b.id)} className="mt-3 flex gap-2"><select name="status" defaultValue={b.status} className="input max-w-[220px]">{BOOKING_STATUS.map((x) => <option key={x} value={x}>{BOOKING_STATUS_LABEL[x]}</option>)}</select><button className="btn btn-dark">Update</button></form>}</div>)}
      {!rows.length && <p className="text-ink/60">No bookings yet.</p>}</div></div>;
}
