import type { Metadata } from "next";
import LeadForm from "@/components/LeadForm";
import { getSettings } from "@/lib/settings";
import WhatsAppButton from "@/components/WhatsAppButton";
import { waLink } from "@/lib/format";
export const metadata: Metadata = { title: "Contact Egypt Knight", description: "Questions about a tour, a date or a custom trip? Message Egypt Knight on WhatsApp or send us a note.", alternates: { canonical: "/contact" } };
export default async function Contact() {
  const g = await getSettings();
  const legal = [g["company.address"], g["company.phone"], g["company.licence"] && `Licence: ${g["company.licence"]}`].filter(Boolean).join(" · ");
  return <div className="container-x max-w-3xl py-10"><h1 className="h1 !text-3xl sm:!text-4xl">Contact us</h1>
    <p className="mt-2 text-ink/70">Fastest is WhatsApp. Or send a message and we'll reply within one working day.</p>
    <WhatsAppButton href={waLink("Hi Egypt Knight, I have a question about a tour.")} label="Chat on WhatsApp" className="btn btn-wa mt-4" />
    <div className="mt-6"><LeadForm kind="CONTACT" cta="Send message" /></div>
    <p className="mt-6 text-xs text-ink/65">{legal || "Office address, phone and company registration: to be added by Egypt Knight."}</p></div>;
}
