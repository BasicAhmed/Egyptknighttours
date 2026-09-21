import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadGuideSheet } from "@/lib/guide-sheet";
import PrintButton from "@/components/PrintButton";
import BuilderCredit from "@/components/BuilderCredit";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Guide sheet", robots: { index: false, follow: false, nocache: true } };
const dateLong = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const money = (n: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: 2 }).format(n);
const digits = (x: string) => x.replace(/\D/g, "");
const Row = ({ k, v }: { k: string; v?: string }) => (v && v.trim() ? <div className="flex gap-3 border-b border-ink/10 py-2 last:border-0"><dt className="w-32 shrink-0 text-sm font-semibold text-ink/65">{k}</dt><dd className="min-w-0 break-words font-semibold">{v}</dd></div> : null);
const Card = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="rounded-2xl border border-ink/15 bg-white p-4 print:break-inside-avoid"><h2 className="font-display text-lg font-extrabold">{title}</h2><div className="mt-1">{children}</div></section>;

export default async function GuideSheetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params; const { t } = await searchParams; const r = await loadGuideSheet(id, t);
  if (r.state === "invalid") notFound();
  if (r.state !== "ok") return <div className="container-x max-w-xl py-16 text-center"><h1 className="font-display text-2xl font-extrabold">{r.state === "expired" ? "This guide sheet has expired" : "This booking was cancelled"}</h1><p className="mt-2 text-ink/70">{r.state === "expired" ? "Sheets close a few days after the trip. Ask the office if you still need the details." : "Please check with the office before doing anything for this booking."}</p></div>;
  const s = r.sheet; const people = [s.adults && `${s.adults} adult${s.adults > 1 ? "s" : ""}`, s.children && `${s.children} child${s.children > 1 ? "ren" : ""}`, s.infants && `${s.infants} infant${s.infants > 1 ? "s" : ""}`].filter(Boolean).join(", ");
  const cw = digits(s.customer.whatsapp || s.customer.phone); const ow = digits(s.company.whatsapp);
  return (
    <div className="container-x max-w-3xl space-y-4 py-6 print:py-0">
      <header className="rounded-2xl bg-ink p-5 text-white print:border print:border-ink print:bg-white print:text-ink">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-gold-500 print:text-ink">Guide sheet · {s.company.name}</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{s.title}</h1>
        <p className="mt-2 text-lg font-semibold">{dateLong(s.travelDate)}{s.pickupTime ? ` · ${s.pickupTime}` : ""}</p>
        <p className="mt-1 text-sm text-white/75 print:text-ink/70">Booking {s.ref} · {people} · {s.isPrivate ? "Private" : "Shared"}{s.guideName ? ` · Guide: ${s.guideName}` : ""}</p>
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">{cw && <a className="btn btn-wa !min-h-[44px]" href={`https://wa.me/${cw}`} target="_blank" rel="noopener noreferrer">WhatsApp {s.customer.name.split(" ")[0]}</a>}{cw && <a className="btn !min-h-[44px] !border !border-white/30 !text-white" href={`tel:+${cw}`}>Call the guest</a>}<PrintButton /></div>
      </header>
      {s.guideNotes.trim() && <section className="rounded-2xl border-2 border-gold-600 bg-gold-500/20 p-4 print:break-inside-avoid"><h2 className="font-display text-lg font-extrabold">Notes from the office</h2><p className="mt-1 whitespace-pre-line text-[16px] font-semibold">{s.guideNotes}</p></section>}
      <Card title="Pickup"><dl><Row k="Time" v={s.pickupTime} /><Row k="Place" v={[s.hotel, s.pickupNotes].filter(Boolean).join(", ")} /><Row k="Meeting point" v={s.meetingPoint} /><Row k="Pickup details" v={s.pickupInfo} /><Row k="Language" v={s.language} /></dl></Card>
      <Card title={`Guests (${s.travelers.length || people})`}>{s.travelers.length ? <ul className="divide-y divide-ink/10">{s.travelers.map((g, i) => <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-2"><span className="font-semibold">{i + 1}. {g.name}</span><span className="text-sm text-ink/70">{g.type === "ADULT" ? "Adult" : g.type === "CHILD" ? "Child" : "Infant"}{g.age != null ? `, ${g.age}` : ""}{g.nationality ? ` · ${g.nationality}` : ""}{g.notes ? ` · ${g.notes}` : ""}</span></li>)}</ul> : <p>{people}</p>}</Card>
      <Card title="Contact"><dl><Row k="Lead guest" v={s.customer.name} /><Row k="WhatsApp / phone" v={s.customer.whatsapp || s.customer.phone} /><Row k="Nationality" v={s.customer.nationality} /><Row k="Emergency contact" v={s.emergencyContact} />{ow && <Row k="Office WhatsApp" v={s.company.whatsapp} />}</dl></Card>
      <Card title="Special care"><dl><Row k="Dietary" v={s.dietary} /><Row k="Access needs" v={s.accessibility} /><Row k="Occasion" v={s.occasion} /><Row k="Requests" v={s.requests} />{!s.dietary && !s.accessibility && !s.occasion && !s.requests && <p className="py-1 text-ink/65">Nothing special noted.</p>}</dl></Card>
      {(s.driver || s.vehicle || s.flightArrival || s.flightDeparture || s.roomType) && <Card title="Transport and stay"><dl><Row k="Driver" v={s.driver} /><Row k="Vehicle" v={s.vehicle} /><Row k="Arrival flight" v={s.flightArrival} /><Row k="Departure flight" v={s.flightDeparture} /><Row k="Room" v={s.roomType} /></dl></Card>}
      {s.plan.length > 0 && <Card title="Plan">{s.plan.map((d, i) => <div key={i} className="border-b border-ink/10 py-3 last:border-0"><h3 className="font-bold">{d.title}</h3>{d.lines.length > 0 && <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-ink/80">{d.lines.map((l, k) => <li key={k}>{l}</li>)}</ul>}</div>)}</Card>}
      {(s.included.length > 0 || s.excluded.length > 0) && <div className="grid gap-4 sm:grid-cols-2">{s.included.length > 0 && <Card title="Included"><ul className="list-disc space-y-1 pl-5 text-[15px]">{s.included.map((x, i) => <li key={i}>{x}</li>)}</ul></Card>}{s.excluded.length > 0 && <Card title="Not included"><ul className="list-disc space-y-1 pl-5 text-[15px]">{s.excluded.map((x, i) => <li key={i}>{x}</li>)}</ul></Card>}</div>}
      {s.whatToBring && <Card title="Guests were told to bring"><p>{s.whatToBring}</p></Card>}
      <Card title="Payment"><dl><Row k="Status" v={s.balance <= 0.009 ? "Paid in full" : `Balance ${money(s.balance, s.currency)}`} /><Row k="Total" v={money(s.total, s.currency)} /><Row k="Paid so far" v={money(s.paid, s.currency)} /></dl><p className="mt-1 text-sm text-ink/65">Check with the office before collecting any money.</p></Card>
      <p className="pb-6 text-center text-xs text-ink/65">Private sheet for the assigned guide. Please do not share this link. It updates automatically if the office changes anything.</p>
      <div className="pb-8 text-center text-xs text-ink/65 print:hidden"><BuilderCredit prefix="Booking system by" dark={false} /></div>
    </div>
  );
}
