import type { Metadata } from "next";
import LeadForm from "@/components/LeadForm";
import WhatsAppButton from "@/components/WhatsAppButton";
import AiPlanner from "@/components/AiPlanner";
import { waLink } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { readAiConfig } from "@/lib/ai/rules";
import { aiConfigured } from "@/lib/ai/claude";
export const metadata: Metadata = { title: "Build My Egypt Trip", description: "Tell us your dates, group and interests. We'll send a suggested Egypt itinerary and a price.", alternates: { canonical: "/plan-my-trip" } };
export default async function Plan() {
  // The AI planner shows only when it is switched on (Settings → AI) and the key is set; the form below always works.
  const ai = readAiConfig(await getSettings()).customer && aiConfigured();
  const wa = waLink("Hi Egypt Knight, I'd like help planning my Egypt trip.");
  return <div className="container-x max-w-3xl py-10"><h1 className="h1 !text-3xl sm:!text-4xl">Build my Egypt trip</h1>
    <p className="mt-2 text-ink/70">{ai ? "Plan it with our AI in a few minutes, or fill in the form." : "Answer a few questions and we'll send a suggested itinerary and a price, usually within one working day."}</p>
    {ai && <div className="mt-6"><AiPlanner whatsapp={wa} /></div>}
    <div className="mt-6">{ai && <p className="mb-2 font-display text-lg font-bold">Or tell us with the form</p>}<LeadForm kind="TRIP_BUILDER" cta="Send me my itinerary" /></div>
    <p className="mt-6 text-sm text-ink/70">Rather talk it through? <WhatsAppButton href={wa} label="Chat on WhatsApp" className="btn btn-wa ml-2" /></p></div>;
}
