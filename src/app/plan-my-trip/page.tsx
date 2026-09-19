import type { Metadata } from "next";
import LeadForm from "@/components/LeadForm";
import WhatsAppButton from "@/components/WhatsAppButton";
import { waLink } from "@/lib/format";
export const metadata: Metadata = { title: "Build My Egypt Trip", description: "Tell us your dates, group and interests. We'll send a suggested Egypt itinerary and a price.", alternates: { canonical: "/plan-my-trip" } };
export default function Plan() {
  return <div className="container-x max-w-3xl py-10"><h1 className="h1 !text-3xl sm:!text-4xl">Build my Egypt trip</h1>
    <p className="mt-2 text-ink/70">Answer a few questions and we'll send a suggested itinerary and a price, usually within one working day.</p>
    <div className="mt-6"><LeadForm kind="TRIP_BUILDER" cta="Send me my itinerary" /></div>
    <p className="mt-6 text-sm text-ink/70">Rather talk it through? <WhatsAppButton href={waLink("Hi Egypt Knight, I'd like help planning my Egypt trip.")} label="Chat on WhatsApp" className="btn btn-wa ml-2" /></p></div>;
}
