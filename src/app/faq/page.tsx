import type { Metadata } from "next";
import { SITE } from "@/lib/format";
export const metadata: Metadata = { title: "Egypt Tours FAQ", description: "Answers about booking, payment, cancellation, pickup and what to expect on an Egypt Knight tour.", alternates: { canonical: "/faq" } };
const faqs = [
  ["How do I book?", "Pick a tour, choose your date and group, and confirm. We contact you on WhatsApp or email to confirm details and send a payment link."],
  ["Do I pay everything upfront?", "Not necessarily. Most tours let you pay a 30% deposit and the rest later. Some let you reserve now and pay later if you're travelling 7+ days out."],
  ["What's your cancellation policy?", "Each tour page states its policy. Our standard is free cancellation up to 24 hours before the start time (to be confirmed by Egypt Knight)."],
  ["Is hotel pickup included?", "For most Cairo, Giza and Luxor tours, yes. Check the inclusions on each tour page."],
  ["Can you build a custom itinerary?", "Yes. Use Build My Egypt Trip and we'll send a plan and a price."],
  ["Are private tours available?", "Many tours have a private option. You'll see it as a choice in the booking form."],
];
export default function FAQ() {
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  void SITE;
  return <div className="container-x max-w-3xl py-10"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} /><h1 className="h1 !text-3xl sm:!text-4xl">Frequently asked questions</h1>
    <div className="mt-6 space-y-2">{faqs.map(([q, a]) => <details key={q} className="card p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-ink/70">{a}</p></details>)}</div></div>;
}
