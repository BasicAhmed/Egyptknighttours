import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { getSettings } from "@/lib/settings";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking Terms & Conditions", description: "The terms that apply when you book a tour, transfer or trip with Egypt Knight Tours: payments, cancellations, changes, responsibilities and more.", alternates: { canonical: "/terms" } };
export default async function Terms() {
  const g = await getSettings(); const co = g["company.name"]; const mail = g["company.email"];
  const cancel = g["invoice.cancellation"].split("\n").map((x) => x.trim()).filter(Boolean); const pay = g["invoice.paymentTerms"].split("\n").map((x) => x.trim()).filter(Boolean);
  return <LegalPage eyebrow="Legal" title="Booking Terms & Conditions" updated="September 2026" intro={`These terms apply when you book a tour, transfer or trip with ${co}. By sending a booking request or paying a deposit, you agree to them. Please read them, and contact us if anything is unclear.`}
    sections={[
      { h: "Our service", p: [`${co} arranges tours, transfers, accommodation and related services in Egypt. Some services, such as hotels, flights and cruise ships, are provided by other companies. We choose them carefully and act as your organiser.`] },
      { h: "Booking and confirmation", p: ["Your booking request is not final until we confirm availability. After you request a booking we send a booking ID (in the form EK-XXXXXX) and payment details. Your booking is confirmed when we receive the required payment and confirm it to you."] },
      { h: "Prices", p: ["Prices are shown in the currency stated on the tour page or invoice, and list what is included and what is not. We may correct obvious pricing errors. Extras you add, such as transfers or photographers, are shown in your total before you confirm."] },
      { h: "Payment", items: pay.length ? pay : ["A deposit is required to confirm your booking. The balance is due before your trip."] },
      { h: "Cancellation and refunds", p: ["The following cancellation policy applies unless your tour page or invoice says otherwise:"], items: cancel },
      { h: "Changes by you", p: [`If you want to change your date or details, contact us as soon as possible on WhatsApp or at ${mail}. We will do our best to help, subject to availability and any costs charged by suppliers.`] },
      { h: "Changes by us", p: ["Sometimes we must adjust an itinerary because of weather, closures, security, or supplier changes. We will offer a comparable alternative. If we must cancel a service and cannot offer a suitable alternative, we will refund what you paid for that service."] },
      { h: "Your responsibilities", items: ["Provide accurate names and details, matching your passport.", "Check the visa and entry requirements for your nationality and have a valid passport.", "Arrange suitable travel insurance for your trip.", "Be at the meeting point on time, and follow your guide's reasonable instructions.", "Tell us about any medical, dietary or accessibility needs when you book."] },
      { h: "Travel insurance", p: ["We strongly recommend insurance covering medical care, cancellation and personal belongings. It is not included unless your quote says so."] },
      { h: "Liability", p: ["We take reasonable care to arrange your services. We are not responsible for events outside our control, such as natural events, government action, strikes, or delays by airlines or other suppliers. Nothing in these terms limits any rights you have under the law that cannot be limited."] },
      { h: "Complaints", p: [`If something is not right during your trip, tell your guide or message us straight away so we can fix it. After your trip, email ${mail} within a reasonable time so we can look into it.`] },
      { h: "Your data", p: ["We use your personal data as described in our Privacy Policy."] },
      { h: "Contact", p: [`${co}${g["company.address"] ? `, ${g["company.address"]}` : ""}. Email ${mail}${g["company.whatsapp"] ? `, WhatsApp ${g["company.whatsapp"]}` : ""}.`] },
    ]} />;
}
