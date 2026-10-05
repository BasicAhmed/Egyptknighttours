import { parseJson } from "./format";
import { resolvePickup, collectLine, type Pickup } from "./order-rules";
import type { ItineraryContent } from "@/pdf/types";

// What a guide sees for one order. Deliberately holds no price, total, payment, deposit, balance, cost or add-on price:
// a guide sheet is for running the day, not for money. The one exception is `collect`, the amount (and note) the office
// typed in for the guide to collect on the day; it is empty unless staff filled it in on the order's Operations tab.
// Passport numbers and files are never included either.
export type GuideSheet = {
  id: string; ref: string; title: string; travelDate: string; pickup: Pickup; language: string; isPrivate: boolean;
  adults: number; children: number; infants: number; travelers: { name: string; type: string; age: number | null; nationality: string; notes: string }[];
  customer: { name: string; whatsapp: string; phone: string; nationality: string }; guideName: string; driver: string; vehicle: string; flightArrival: string; flightDeparture: string; roomType: string; occasion: string; emergencyContact: string;
  dietary: string; accessibility: string; requests: string; guideNotes: string; collect: string;
  plan: { title: string; lines: string[] }[]; included: string[]; excluded: string[]; whatToBring: string; company: { name: string; whatsapp: string; email: string };
};
type B = {
  id: string; ref: string; titleOverride: string | null; travelDate: string; pickupTime: string | null; hotel: string | null; pickupLocation: string | null; meetingPoint: string | null; pickupInfo: string | null;
  preferredLanguage: string | null; isPrivate: boolean; adults: number; children: number; infants: number; guestName: string | null; driver: string | null; vehicle: string | null;
  flightArrival: string | null; flightDeparture: string | null; roomType: string | null; occasion: string | null; emergencyContact: string | null; dietary: string | null; accessibility: string | null;
  specialRequests: string | null; guideNotes: string | null; guideCollectAmount: number | null; guideCollectNote: string | null; currency: string;
};
type T = { title: string; meetingPoint: string | null; pickupInfo: string | null; itinerary: string; included: string; excluded: string; whatToBring: string | null };
type C = { name: string; whatsapp: string | null; phone: string | null; nationality: string | null };
const ORDER = ["ADULT", "CHILD", "INFANT"];

// Builds the sheet from the order, its tour and its customer. Only the fields named here are read, so an amount stored on
// the order (total, deposit, add-on prices, cost) cannot reach the guide by being added to the order later.
export function composeGuideSheet(i: { b: B; t: T; c: C; travelers: { fullName: string; type: string; age: number | null; nationality: string | null; notes: string | null }[]; guideName: string; itineraryContent: string | null; company: { name: string; whatsapp: string; email: string } }): GuideSheet {
  const { b, t, c } = i;
  const content = i.itineraryContent ? parseJson<ItineraryContent | null>(i.itineraryContent, null) : null;
  const plan = content?.days?.length
    ? content.days.map((d, n) => ({ title: `Day ${n + 1}${d.title ? ": " + d.title : ""}${d.location ? " (" + d.location + ")" : ""}`, lines: [...d.blocks.filter((x) => x.title).map((x) => `${x.time ? x.time + " · " : ""}${x.title}${x.description ? ": " + x.description : ""}`), ...(d.hotel?.name ? [`Overnight: ${d.hotel.name}`] : [])] }))
    : parseJson<{ title: string; text: string }[]>(t.itinerary, []).map((d) => ({ title: d.title, lines: d.text ? [d.text] : [] }));
  return {
    id: b.id, ref: b.ref, title: b.titleOverride || t.title, travelDate: b.travelDate, pickup: resolvePickup(b, t), language: b.preferredLanguage ?? "", isPrivate: b.isPrivate,
    adults: b.adults, children: b.children, infants: b.infants, travelers: i.travelers.map((x) => ({ name: x.fullName, type: x.type, age: x.age, nationality: x.nationality ?? "", notes: x.notes ?? "" })).sort((a, z) => ORDER.indexOf(a.type) - ORDER.indexOf(z.type)),
    customer: { name: b.guestName || c.name, whatsapp: c.whatsapp ?? "", phone: c.phone ?? "", nationality: c.nationality ?? "" }, guideName: i.guideName, driver: b.driver ?? "", vehicle: b.vehicle ?? "", flightArrival: b.flightArrival ?? "", flightDeparture: b.flightDeparture ?? "", roomType: b.roomType ?? "", occasion: b.occasion ?? "", emergencyContact: b.emergencyContact ?? "",
    dietary: b.dietary ?? "", accessibility: b.accessibility ?? "", requests: b.specialRequests ?? "", guideNotes: b.guideNotes ?? "", collect: collectLine(b.guideCollectAmount, b.guideCollectNote, b.currency),
    plan, included: parseJson<string[]>(t.included, []), excluded: parseJson<string[]>(t.excluded, []), whatToBring: t.whatToBring ?? "", company: i.company,
  };
}
