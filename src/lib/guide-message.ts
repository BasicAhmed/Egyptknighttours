import type { Order, Guide } from "./orders";
import { orderPickup, collectLine } from "./order-rules";

const dateLong = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// The WhatsApp message a guide receives: everything about the trip, plus the private link to the full guide sheet.
// It never includes passport numbers or passport files, and no price or payment: the only money it can carry is what the
// office typed in for the guide to collect on the day (Operations tab), and that line is left out when nothing was typed.
export function buildGuideMessage(o: Order, g: Guide, url: string): string {
  const kids = o.travelers.filter((t) => t.type === "CHILD" && t.age != null).map((t) => t.age);
  const people = [o.adults && `${o.adults} adult${o.adults > 1 ? "s" : ""}`, o.children && `${o.children} child${o.children > 1 ? "ren" : ""}${kids.length ? ` (ages ${kids.join(", ")})` : ""}`, o.infants && `${o.infants} infant${o.infants > 1 ? "s" : ""}`].filter(Boolean).join(", ");
  const guests = o.travelers.length ? o.travelers.map((t, i) => `${i + 1}. ${t.name}${t.type !== "ADULT" ? ` (${t.type === "CHILD" ? "child" : "infant"}${t.age != null ? " " + t.age : ""})` : ""}${t.nationality ? ", " + t.nationality : ""}`).join("\n") : "";
  const line = (k: string, v: string) => (v && v.trim() ? `${k}: ${v.trim()}` : "");
  const pickup = orderPickup(o);
  const parts = [
    `Hi ${g.name.split(" ")[0]}, here are the full details for your tour.`, "",
    `*${o.title}*  (Ref ${o.ref})`,
    line("Date", `${dateLong(o.travelDate)}${pickup.time ? " at " + pickup.time : ""}`),
    line("Pickup", pickup.placeLine), line("Meeting point", pickup.meetingPoint), line("Pickup details", pickup.details),
    line("Guests", `${people} (${o.isPrivate ? "private" : "shared"})`),
    line("Language", o.ops.preferredLanguage),
    line("Customer", [o.customer.name, o.customer.whatsapp || o.customer.phone, o.customer.nationality].filter(Boolean).join(", ")),
    line("Driver", [o.ops.driver, o.ops.vehicle].filter(Boolean).join(", ")),
    line("Arrival flight", o.ops.flightArrival), line("Departure flight", o.ops.flightDeparture), line("Room", o.ops.roomType), line("Occasion", o.ops.occasion),
    line("Dietary", o.dietary), line("Access needs", o.accessibility), line("Requests", o.requests), line("Emergency contact", o.ops.emergencyContact), line("Notes from the office", o.ops.guideNotes),
    line("Collect on the day", collectLine(Number(o.ops.collectAmount) || null, o.ops.collectNote, o.currency)),
    guests ? `\nGuest list:\n${guests}` : "",
    `\nFull guide sheet (plan of the day, contacts, everything): ${url}`,
  ];
  return parts.filter((x, i, a) => x !== "" || (a[i - 1] !== "" && i > 0)).join("\n");
}
