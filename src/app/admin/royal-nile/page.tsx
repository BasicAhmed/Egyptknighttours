import { requireStaff } from "@/lib/auth";
import { rnAvailability, rnBookings, rnReady, rnUrl } from "@/lib/royal-nile";
import Notice from "@/components/Notice";
import { bookRoyalNile } from "../royal-nile-actions";
export const dynamic = "force-dynamic";

const MO = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const add = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nice = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const PILL: Record<string, string> = { CONFIRMED: "bg-[#E9F6EE] text-[#17663A]", CHECKED_IN: "bg-[#E9F6EE] text-[#17663A]", COMPLETED: "bg-black/5 text-ink/60", CANCELLED: "bg-red-50 text-red-800" };

function Month({ month, taken, today }: { month: string; taken: Set<string>; today: string }) {
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
  return (
    <div>
      <p className="mb-2 font-semibold">{MO[m - 1]} {y}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[13px]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="text-[11px] font-bold text-ink/45">{d}</span>)}
        {cells.map((d, i) => !d ? <span key={i} /> : <span key={d} title={taken.has(d) ? "Booked" : "Free"} className={`rounded-md py-1.5 ${d < today ? "text-ink/25" : taken.has(d) ? "bg-red-50 text-red-700 line-through" : "bg-[#E9F6EE] font-semibold text-[#17663A]"}`}>{Number(d.slice(8))}</span>)}
      </div>
    </div>
  );
}

export default async function RoyalNile({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("corporate"); const sp = await searchParams;
  if (!rnReady()) return (
    <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">The Royal Nile Residence</h1>
      <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">Not connected yet. In Vercel → Settings → Environment Variables add <b>LINK_SECRET</b> (the same long random text as on the residence site) and <b>ROYAL_NILE_URL</b> (the residence site address), then redeploy.</p></div>
  );
  const [av, list] = await Promise.all([rnAvailability(), rnBookings()]);
  const taken = new Set(av.ok ? av.data.taken : []);
  const today = av.ok ? av.data.today : new Date().toISOString().slice(0, 10);
  const months = [0, 1, 2].map((k) => { const d = new Date(today + "T00:00:00Z"); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + k); return d.toISOString().slice(0, 7); });
  const v = (k: string) => (sp[k] ?? "").slice(0, 120);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">The Royal Nile Residence</h1><p className="text-sm text-ink/65">Our partner apartment in Aswan (3 bedrooms, up to {av.ok ? av.data.maxGuests : 6} guests, Nile view). Book it here for our guests — it's a separate business with its own admin.</p></div>
        <a href={`${rnUrl().replace(/\/$/, "")}/stay`} target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-[44px]">See the residence ↗</a>
      </div>
      <div className="mt-3"><Notice n={sp.n} e={sp.e} /></div>
      {!av.ok ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{av.error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-extrabold">Free dates</h2><p className="text-xs text-ink/60"><span className="rounded bg-[#E9F6EE] px-1.5 text-[#17663A]">12</span> free · <span className="rounded bg-red-50 px-1.5 text-red-700 line-through">12</span> booked</p></div>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">{months.map((m) => <Month key={m} month={m} taken={taken} today={today} />)}</div>
          {av.ok ? <p className="mt-4 text-sm text-ink/65">Our price: <b className="text-ink">${av.data.nightlyUsd}</b> per night for the whole apartment{av.data.cleaningUsd ? ` + $${av.data.cleaningUsd} cleaning` : ""}. Check-in {av.data.checkInTime}, check-out {av.data.checkOutTime}.</p> : null}
        </div>

        <form action={bookRoyalNile} className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Book it for a guest</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block"><span className="label">Check-in</span><input className="input" type="date" name="checkIn" min={today} defaultValue={v("in")} required /></label>
            <label className="block"><span className="label">Check-out</span><input className="input" type="date" name="checkOut" min={add(today, 1)} defaultValue={v("out")} required /></label>
            <label className="block"><span className="label">Guests</span><input className="input" type="number" name="guests" min={1} max={av.ok ? av.data.maxGuests : 6} defaultValue={v("guests") || "2"} required /></label>
            <label className="block"><span className="label">Our order (optional)</span><input className="input" name="orderRef" defaultValue={v("order")} placeholder="e.g. EK-1234" /></label>
            <label className="col-span-2 block"><span className="label">Guest name</span><input className="input" name="name" defaultValue={v("name")} required /></label>
            <label className="block"><span className="label">Guest WhatsApp</span><input className="input" name="phone" defaultValue={v("phone")} /></label>
            <label className="block"><span className="label">Guest email</span><input className="input" type="email" name="email" defaultValue={v("email")} /></label>
            <label className="col-span-2 block"><span className="label">Note for the residence</span><textarea className="input" name="notes" rows={2} placeholder="Arrival time, cruise name, anything they should know" /></label>
          </div>
          <button className="btn btn-primary mt-4 w-full">Book The Royal Nile Residence</button>
          <p className="mt-2 text-xs text-ink/55">The dates are checked again when you press book, so nobody else can take them at the same moment.</p>
        </form>
      </div>

      <div className="card mt-4 overflow-x-auto p-5">
        <h2 className="font-display text-lg font-extrabold">Our guests at the residence</h2>
        {!list.ok ? <p className="mt-2 text-sm text-red-800">{list.error}</p> : !list.data.bookings.length ? <p className="mt-2 text-sm text-ink/60">No bookings yet.</p> : (
          <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-ink/50"><th className="py-2">Guest</th><th>Dates</th><th>Guests</th><th>Our order</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>{list.data.bookings.map((b) => (
              <tr key={b.ref} className="border-t border-black/5"><td className="py-2.5"><b>{b.name}</b><div className="text-xs text-ink/55">{b.ref}</div></td><td>{nice(b.checkIn)} → {nice(b.checkOut)} <span className="text-ink/50">({b.nights}n)</span></td><td>{b.guests}</td><td>{b.partnerRef || "—"}</td>
                <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PILL[b.status] ?? "bg-[#FBF0DF] text-[#8A5A17]"}`}>{b.statusLabel}</span></td><td className="text-right">${b.totalUsd}</td></tr>))}</tbody></table>
        )}
      </div>
    </div>
  );
}
