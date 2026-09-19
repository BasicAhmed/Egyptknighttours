import { NextResponse } from "next/server";
import { loadBooking } from "@/lib/booking-view";
import { verifyRef } from "@/lib/booking-token";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params; const t = new URL(req.url).searchParams.get("t");
  if (!verifyRef(ref, t)) return new NextResponse("Not found", { status: 404 });
  const d = await loadBooking(ref); if (!d) return new NextResponse("Not found", { status: 404 });
  const day = d.b.travelDate.replace(/-/g, "");
  const end = new Date(d.b.travelDate + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() + Math.max(1, d.tour.durationDays));
  const endStr = end.toISOString().slice(0, 10).replace(/-/g, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Egypt Knight Tours//Booking//EN", "BEGIN:VEVENT", `UID:${d.b.ref}@egyptknight`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${endStr}`, `SUMMARY:${esc(d.tour.title)}`, `DESCRIPTION:${esc(`Egypt Knight booking ${d.b.ref}. Pickup: ${d.b.hotel ?? "to be confirmed"}. ${d.tour.pickupInfo}`)}`, `LOCATION:${esc(d.dest.name + ", Egypt")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${d.b.ref}.ics"` } });
}
