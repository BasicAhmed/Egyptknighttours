import type { Metadata } from "next";
import { jsonLd } from "@/lib/jsonld";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTourBySlug, listTours } from "@/lib/queries";
import { money, parseJson, waLink, SITE, duration, CATEGORY_LABEL, toDateInput } from "@/lib/format";
import AvailabilityCard from "@/components/AvailabilityCard";
import TourCard from "@/components/TourCard";
import Tracker from "@/components/Tracker";
import WhatsAppButton from "@/components/WhatsAppButton";
import SiteImage from "@/components/SiteImage";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await getTourBySlug((await params).slug);
  if (!d) return {};
  return { title: d.tour.seoTitle || d.tour.title, description: d.tour.seoDescription || d.tour.shortDescription, alternates: { canonical: `/tours/${d.tour.slug}` }, openGraph: { title: d.tour.title, description: d.tour.shortDescription } };
}
const List = ({ items, mark }: { items: string[]; mark: string }) => <ul className="space-y-1.5 text-sm">{items.map((i) => <li key={i}>{mark} {i}</li>)}</ul>;

export default async function TourPage({ params }: P) {
  const d = await getTourBySlug((await params).slug);
  if (!d) notFound();
  const { tour: t, dest, addons, reviews, rating } = d;
  const hl = parseJson<string[]>(t.highlights, []); const it = parseJson<{ title: string; text: string }[]>(t.itinerary, []);
  const inc = parseJson<string[]>(t.included, []); const exc = parseJson<string[]>(t.excluded, []); const faqs0 = parseJson<{ q: string; a: string }[]>(t.faqs, []);
  const faqs = faqs0.length ? faqs0 : [{ q: `Is hotel pickup included on the ${t.title}?`, a: "Pickup is arranged for most tours. Tell us your hotel when you book and we confirm the exact time by WhatsApp and email." }, { q: `Can I book a private ${dest.name} tour?`, a: t.isPrivateAvailable ? "Yes. Choose Private when you book and the tour runs just for your group, at your pace." : "This tour runs as a shared experience. Message us and we can look at a private option." }, { q: `How do I pay for the ${t.title}?`, a: "Pay a 50% deposit to confirm your booking and the rest before you travel. We send secure payment details after you book." }];
  const price = t.discountPrice ?? t.price;
  const same = (await listTours({ destination: dest.slug }, 6)).filter((x) => x.slug !== t.slug).slice(0, 2);
  const other = (await listTours({}, 8)).filter((x) => x.slug !== t.slug && !same.find((y) => y.slug === x.slug)).slice(0, 3 - same.length);
  const related = [...same, ...other];
  const minDate = toDateInput(new Date(Date.now() + 86400000));
  const ld = [
    { "@context": "https://schema.org", "@type": "TouristTrip", name: t.title, description: t.shortDescription, url: `${SITE}/tours/${t.slug}`, touristType: t.audience === "ALL" ? undefined : t.audience.toLowerCase(),
      offers: { "@type": "Offer", price, priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${SITE}/tours/${t.slug}` },
      ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.avg.toFixed(1), reviewCount: rating.count } } : {}) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", "/"], ["Tours", "/tours"], [t.title, `/tours/${t.slug}`]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) },
    ...(faqs.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
  ];
  const wa = waLink(`Hi Egypt Knight, I'm interested in "${t.title}". Can you help me with dates and availability?`);
  return (
    <div className="container-x py-8 pb-28 lg:pb-8">
      <Tracker name="view_tour" tourSlug={t.slug} />
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(o) }} />)}
      <nav aria-label="Breadcrumb" className="text-sm text-ink/65"><Link href="/">Home</Link> / <Link href="/tours">Tours</Link> / <Link href={`/destinations/${dest.slug}`}>{dest.name}</Link></nav>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <SiteImage src={t.imageUrl || dest.imageUrl} alt={`${t.title} in ${dest.name}, Egypt`} destination={dest.slug} priority sizes="(min-width: 1024px) 780px, 100vw" className="relative aspect-[16/10] rounded-2xl sm:aspect-[16/9]" />
          
          <h1 className="h1 mt-3 !text-3xl sm:!text-4xl">{t.title}</h1>
          <p className="mt-3 text-sm font-medium text-ink/70">{[CATEGORY_LABEL[t.category], duration(t), dest.name, t.isPrivateAvailable ? "Private available" : null, rating ? `★ ${rating.avg.toFixed(1)} (${rating.count} reviews)` : "New: no reviews yet"].filter(Boolean).join("  ·  ")}</p>
          <p className="mt-4 text-lg text-ink/80">{t.shortDescription}</p>
          <h2 className="h2 mt-8">About this {dest.name} tour</h2><p className="mt-2 whitespace-pre-line text-ink/80">{t.longDescription}</p>
          {hl.length > 0 && <><h2 className="h2 mt-8">Tour highlights</h2><List items={hl} mark="✓" /></>}
          {it.length > 0 && <><h2 className="h2 mt-8">Itinerary</h2><ol className="mt-3 space-y-3">{it.map((s, i) => <li key={i} className="card p-4"><p className="font-semibold">{i + 1}. {s.title}</p><p className="text-sm text-ink/70">{s.text}</p></li>)}</ol></>}
          <div className="mt-8 grid gap-6 sm:grid-cols-2"><div><h2 className="h2 !text-xl">Included</h2><div className="mt-2"><List items={inc} mark="✓" /></div></div><div><h2 className="h2 !text-xl">Not included</h2><div className="mt-2"><List items={exc} mark="✗" /></div></div></div>
          <h2 className="h2 mt-8">Good to know</h2>
          <dl className="mt-3 space-y-3 text-sm">{[["Pickup", t.pickupInfo], ["Meeting point", t.meetingPoint], ["What to bring", t.whatToBring], ["Activity level", t.activityLevel.toLowerCase()], ["Cancellation", t.cancellationPolicy]].map(([k, v]) => v && <div key={k}><dt className="font-semibold">{k}</dt><dd className="text-ink/70">{v}</dd></div>)}</dl>
          {faqs.length > 0 && <><h2 className="h2 mt-8">FAQ</h2><div className="mt-3 space-y-2">{faqs.map((f) => <details key={f.q} className="card p-4"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-ink/70">{f.a}</p></details>)}</div></>}
          <h2 className="h2 mt-8">Reviews</h2>
          {reviews.length ? <div className="mt-3 space-y-3">{reviews.map((r) => <div key={r.id} className="card p-4"><p className="font-semibold">★ {r.rating} · {r.title}</p><p className="text-sm text-ink/70">{r.body}</p><p className="mt-1 text-xs text-ink/65">{r.authorName}{r.country ? `, ${r.country}` : ""}{r.tripDate ? ` · ${r.tripDate}` : ""}</p></div>)}</div>
            : <p className="mt-2 text-sm text-ink/70">No reviews yet. We only show real reviews from travellers who've been on this tour.</p>}
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 flex items-end justify-between"><p className="text-sm text-ink/65">From <span className="text-2xl font-extrabold text-ink">{money(price)}</span> {t.pricingModel === "PER_GROUP" ? "/ group" : "/ person"}{t.discountPrice != null && <s className="ml-1 text-ink/65">{money(t.price)}</s>}</p></div>
          <AvailabilityCard slug={t.slug} pricingModel={t.pricingModel} maxTravelers={t.maxTravelers} isPrivateAvailable={t.isPrivateAvailable} isGroupAvailable={t.isGroupAvailable} minDate={minDate} />
          <div className="card mt-4 p-4 text-sm"><p className="font-semibold">Not sure this fits?</p><p className="text-ink/70">Ask us on WhatsApp and we'll help you choose.</p><WhatsAppButton href={wa} label="Ask on WhatsApp" className="btn btn-wa mt-3 w-full" tourSlug={t.slug} /></div>
        </aside>
      </div>
      <section className="mt-12"><h2 className="h2">Complete your Egypt trip</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <TourCard key={r.id} t={r} />)}</div>
        <p className="mt-4 text-sm text-ink/70">Read more: <Link className="underline" href={`/destinations/${dest.slug}`}>{dest.name} travel guide</Link> · <Link className="underline" href="/egypt-travel-guide">Egypt travel guide</Link></p></section>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-ink/10 bg-white p-3 lg:hidden">
        <div className="flex-1 leading-tight"><p className="text-xs text-ink/65">From</p><p className="font-bold">{money(price)}</p></div>
        <WhatsAppButton href={wa} label="WhatsApp" tourSlug={t.slug} /><a href="#book" className="btn btn-primary">Book now</a>
      </div>
    </div>
  );
}
