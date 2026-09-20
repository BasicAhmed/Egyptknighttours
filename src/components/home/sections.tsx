import Link from "next/link";
import WhatsAppButton from "../WhatsAppButton";
import { waLink } from "@/lib/format";

export const https = (u: string) => (/^https:\/\//i.test((u ?? "").trim()) ? u.trim() : "");
export const plus = (v: string) => { const t = (v ?? "").trim(); return t && !t.endsWith("+") ? `${t}+` : t; };
const Icon = ({ d, size = 22, color = "currentColor" }: { d: string; size?: number; color?: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d={d} /></svg>;
const P = {
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z", x: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  pin: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  phone: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z", clock: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  shield: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z", person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  history: "M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
  wave: "M17 16.99c-1.35 0-2.2.42-2.95.8-.65.33-1.18.6-2.05.6-.9 0-1.4-.25-2.05-.6-.75-.37-1.6-.8-2.95-.8s-2.2.42-2.95.8c-.65.33-1.17.6-2.05.6v2c1.35 0 2.2-.42 2.95-.8.65-.33 1.17-.6 2.05-.6s1.4.25 2.05.6c.75.38 1.57.8 2.95.8s2.2-.42 2.95-.8c.65-.33 1.18-.6 2.05-.6.9 0 1.4.25 2.05.6.75.38 1.58.8 2.95.8v-2c-.9 0-1.4-.25-2.05-.6-.75-.38-1.6-.8-2.95-.8zm0-4.45c-1.35 0-2.2.43-2.95.8-.65.32-1.18.6-2.05.6-.9 0-1.4-.25-2.05-.6-.75-.38-1.6-.8-2.95-.8s-2.2.43-2.95.8c-.65.32-1.17.6-2.05.6v2c1.35 0 2.2-.43 2.95-.8.65-.35 1.15-.6 2.05-.6s1.4.25 2.05.6c.75.38 1.57.8 2.95.8s2.2-.43 2.95-.8c.65-.35 1.15-.6 2.05-.6s1.4.25 2.05.6c.75.38 1.58.8 2.95.8v-2c-.85 0-1.35-.25-2.05-.6-.75-.38-1.6-.8-2.95-.8z",
  sun: "M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z",
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  compass: "M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z",
  chat: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z",
  ig: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z",
  fb: "M13 22v-8h2.7l.4-3.2H13V8.8c0-.9.3-1.5 1.6-1.5H16V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.5H7V14h2.8v8H13z",
  tt: "M16.6 5.82A4.28 4.28 0 0115.54 3h-3.09v12.4a2.59 2.59 0 01-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 004.3 1.38V7.3s-1.88.09-3.24-1.48z",
  yt: "M21.58 7.19a2.5 2.5 0 00-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 002.42 7.19C2 8.76 2 12 2 12s0 3.24.42 4.81a2.5 2.5 0 001.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 001.76-1.77C22 15.24 22 12 22 12s0-3.24-.42-4.81zM10 15V9l5.2 3-5.2 3z",
};
const Stars = () => <span className="flex gap-0.5 text-gold-600">{[0, 1, 2, 3, 4].map((i) => <Icon key={i} d={P.star} size={16} />)}</span>;
const Head = ({ eyebrow, title, sub, center = false, light = false }: { eyebrow: string; title: string; sub?: string; center?: boolean; light?: boolean }) => (
  <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}><p className={`eyebrow ${light ? "!text-gold-500" : ""}`}>{eyebrow}</p><h2 className={`h2 mt-2 ${light ? "text-white" : ""}`}>{title}</h2>{sub && <p className={`mt-3 text-[17px] ${light ? "text-white/70" : "text-ink/65"}`}>{sub}</p>}</div>
);

export type SiteCfg = Record<string, string>;
export type Review = { id: string; name: string; country: string; rating: number; title: string; body: string; source: string; url: string; reviewDate: string };

export function TrustBand({ g }: { g: SiteCfg }) {
  const ta = https(g["site.tripadvisorUrl"]);
  const items = [[plus(g["site.years"]), "years of experience", "Local, and here every day"], [plus(g["site.tours"]), "tours completed", "Real trips, real travellers"], [plus(g["site.reviews"]), "five-star reviews", "On Tripadvisor"], ["Thousands", "of happy travellers", "Trusted by guests from around the world"]];
  return (
    <section aria-label="Why travellers trust us" className="border-y border-ink/10 bg-[#FFF9EC] cv-auto">
      <div className="container-x py-10">
        <p className="text-center font-display text-xl font-extrabold sm:text-2xl">Trusted by thousands of travellers</p>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-4">{items.map(([n, l, s]) => <div key={l} className="text-center"><p className="font-display text-[30px] font-extrabold leading-none sm:text-5xl">{n}</p><p className="mt-1.5 text-[15px] font-bold">{l}</p><p className="text-sm text-ink/65">{s}</p></div>)}</div>
        {ta && <p className="mt-6 text-center"><a href={ta} target="_blank" rel="noopener noreferrer" className="text-sm font-bold underline decoration-gold-600 decoration-2 underline-offset-4">Read our reviews on Tripadvisor →</a></p>}
      </div>
    </section>
  );
}

export function WhyEgypt() {
  const items: [string, string, string][] = [
    [P.history, "History that's still standing", "The Great Pyramid of Giza is around 4,500 years old, and it's only the beginning. Temples, tombs and cities from every era are still here to walk through."],
    [P.wave, "One river, endless stories", "For thousands of years life in Egypt has followed the Nile. Sail it, see it from a felucca, and visit the temples that line its banks."],
    [P.compass, "More than the pyramids", "Museums, souks, desert, oases, Red Sea reefs and Mediterranean shores. One country, and no two days alike."],
    [P.sun, "Sunshine and easy weather", "Warm and sunny for much of the year, with the most comfortable sightseeing weather from October to April."],
    [P.shield, "Heritage the world protects", "Egypt is home to UNESCO World Heritage Sites, including the pyramid fields of Memphis and the temples of Thebes and Nubia."],
    [P.heart, "Hospitality you'll remember", "Egyptians love welcoming guests. Expect tea, conversation and stories at almost every stop."],
  ];
  return (
    <section className="container-x py-16 cv-auto"><Head eyebrow="Why Egypt" title="There's a reason it's on everyone's list" sub="Egypt isn't one trip. It's dozens, and the right guide makes all the difference." />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(([d, h, p]) => <article key={h} className="rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_2px_12px_rgba(20,16,16,.05)]"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 text-ink"><Icon d={d} /></span><h3 className="mt-4 font-display text-xl font-extrabold">{h}</h3><p className="mt-2 text-[15px] leading-relaxed text-ink/70">{p}</p></article>)}</div></section>
  );
}

export function HowItWorks() {
  const steps: [string, string][] = [["Choose your tour", "Pick a tour and your date. You see your total straight away, with what's included and what isn't."], ["Confirm with a 50% deposit", "Send your booking request and pay a 50% deposit to secure it. We'll send payment details by WhatsApp and email."], ["Get your confirmation", "You receive a booking ID (like EK-AB12CD), your invoice and your itinerary. Track everything online any time."], ["Meet your guide", "We send pickup details the day before. Your guide meets you, and our team is on WhatsApp if you need anything."]];
  return (
    <section className="bg-ink py-16 text-white"><div className="container-x"><Head light eyebrow="How booking works" title="Simple from first click to the pyramids" sub="No hidden steps and no chasing. You always know what happens next." />
      <ol className="mt-9 grid gap-4 md:grid-cols-4">{steps.map(([h, p], i) => <li key={h} className="rounded-3xl border border-white/10 bg-white/[.06] p-6"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-500 font-display text-lg font-extrabold text-ink">{i + 1}</span><h3 className="mt-4 font-display text-lg font-extrabold">{h}</h3><p className="mt-2 text-[15px] leading-relaxed text-white/70">{p}</p></li>)}</ol>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/tours" className="btn btn-primary">Find your tour</Link><Link href="/track" className="btn !border !border-white/25 !text-white hover:!border-white">Track a booking</Link></div></div></section>
  );
}

export function CompareTable() {
  const rows: [string, string, string, string][] = [
    ["Who runs your tour", "The local team that takes your booking", "Independent operators. It varies by listing", "A large operator with set itineraries"],
    ["Contact before and during your trip", "Direct WhatsApp with our team", "Through the platform's messaging", "Usually a call centre or an agent"],
    ["Private and tailor-made trips", "Yes, built around you", "Depends on the listing", "Often limited to fixed groups"],
    ["Prices and inclusions", "Clear inclusions, booked with us directly", "Vary by listing and platform", "Set package pricing"],
    ["Paying", "50% deposit to confirm, the rest later", "Varies by listing", "Varies by operator"],
    ["Local knowledge", "Guides who work in Egypt every day", "Varies by operator", "Varies by operator"],
  ];
  return (
    <section className="container-x py-16 cv-auto"><Head eyebrow="Why Egypt Knight" title="Booking direct with a local team feels different" sub="Here's how we compare with the usual ways to book a trip to Egypt." />
      <p className="mt-6 text-xs font-semibold text-ink/65 md:hidden">Swipe the table sideways to compare →</p>
      <div tabIndex={0} role="region" aria-label="Comparison table, scroll sideways on small screens" className="mt-3 overflow-x-auto rounded-3xl border border-ink/10 bg-white shadow-[0_2px_14px_rgba(20,16,16,.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink md:mt-9">
        <table className="w-full min-w-[720px] border-collapse text-left text-[15px]"><thead><tr><th className="p-4 pl-6 text-sm font-semibold text-ink/65"><span className="sr-only">Feature</span></th>
          <th className="w-[28%] bg-gold-500 p-4 font-display text-lg font-extrabold">Egypt Knight Tours</th><th className="w-[24%] p-4 font-display font-extrabold text-ink/70">Booking marketplaces</th><th className="w-[24%] p-4 pr-6 font-display font-extrabold text-ink/70">Big group operators</th></tr></thead>
          <tbody>{rows.map(([f, a, b, c]) => <tr key={f} className="border-t border-ink/10"><th scope="row" className="p-4 pl-6 font-semibold">{f}</th>
            <td className="bg-gold-500/15 p-4 font-semibold"><span className="flex items-start gap-2"><span className="mt-0.5 shrink-0 text-[#17663A]"><Icon d={P.check} size={20} /></span>{a}</span></td><td className="p-4 text-ink/65">{b}</td><td className="p-4 pr-6 text-ink/65">{c}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-ink/65">Based on typical arrangements. Details vary between providers.</p></section>
  );
}

export function GuidesSection() {
  const pts: [string, string, string][] = [
    [P.clock, "They know the timing", "When to arrive, which side to start on, and how to beat the crowds and the midday heat. That one decision changes your whole day."],
    [P.history, "They tell the story", "Anyone can point at a wall. Our guides explain who built it, why, and what it meant, so it stays with you."],
    [P.person, "They read your group", "Families, couples, history lovers, first-timers. They set the pace and the depth to suit the people in front of them."],
    [P.compass, "They handle the logistics", "Tickets, entrances, drivers, meeting points. You enjoy the day while they sort the details."],
    [P.pin, "They know the good spots", "The best photo points, quiet corners and local places to eat, the things that never make it into a guidebook."],
    [P.shield, "They look after you", "Water, breaks, comfort and safety. They stay with you and keep everything smooth from pickup to drop-off."],
  ];
  return (
    <section className="bg-[#FFF9EC] py-16 cv-auto"><div className="container-x"><Head eyebrow="Our guides" title="Guides who make Egypt make sense" sub="A great guide is the difference between seeing Egypt and understanding it. This is what ours are known for." />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pts.map(([d, h, p]) => <article key={h} className="flex gap-4 rounded-3xl border border-ink/10 bg-white p-5 shadow-[0_2px_12px_rgba(20,16,16,.05)]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-gold-500"><Icon d={d} size={20} /></span><div><h3 className="font-display text-lg font-extrabold">{h}</h3><p className="mt-1 text-[15px] leading-relaxed text-ink/70">{p}</p></div></article>)}</div></div></section>
  );
}

export function ReviewsSection({ g, reviews }: { g: SiteCfg; reviews: Review[] }) {
  const ta = https(g["site.tripadvisorUrl"]);
  if (!reviews.length && !ta) return null;
  return (
    <section className="container-x py-16 cv-auto"><div className="flex flex-wrap items-end justify-between gap-4"><Head eyebrow="Reviews" title="What our travellers say" sub="Real reviews from real trips." />
      <div className="rounded-2xl border border-ink/10 bg-white px-5 py-4 shadow-[0_2px_12px_rgba(20,16,16,.06)]"><Stars /><p className="mt-1 font-display text-2xl font-extrabold">{plus(g["site.reviews"])} five-star reviews</p><p className="text-sm text-ink/65">on Tripadvisor</p>{ta && <a href={ta} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold underline decoration-gold-600 decoration-2 underline-offset-4">Read them all →</a>}</div></div>
      {reviews.length > 0 && <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{reviews.map((r) => (
        <figure key={r.id} className="flex flex-col rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_2px_12px_rgba(20,16,16,.06)]"><Stars />{r.title && <p className="mt-3 font-display text-lg font-extrabold leading-snug">{r.title}</p>}
          <blockquote className="mt-2 line-clamp-6 flex-1 text-[15px] leading-relaxed text-ink/75">{r.body}</blockquote>
          <figcaption className="mt-4 border-t border-ink/10 pt-3 text-sm"><b>{r.name}</b>{r.country ? <span className="text-ink/65">, {r.country}</span> : null}<span className="block text-xs text-ink/65">{[r.reviewDate, r.source && `on ${r.source}`].filter(Boolean).join(" · ")}{https(r.url) && <> · <a className="underline" href={https(r.url)} target="_blank" rel="noopener noreferrer">View</a></>}</span></figcaption></figure>))}</div>}</section>
  );
}

export function GuidesLinks({ guides }: { guides: { id: string; slug: string; title: string; cluster: string; summary: string }[] }) {
  return (
    <section className="container-x py-16"><Head eyebrow="Read before you go" title="Plan it like a local" sub="Short, practical guides to the questions every first-time visitor asks." />
      <div className="mt-9 grid gap-4 md:grid-cols-3">{guides.map((g, i) => (
        <Link key={g.id} href={`/egypt-travel-guide/${g.slug}`} className="group relative overflow-hidden rounded-3xl border border-gold-600/30 bg-[#FFF6E0] p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(20,16,16,.12)]">
          <span aria-hidden="true" className="font-display text-6xl font-extrabold leading-none text-[#B07A24]">{String(i + 1).padStart(2, "0")}</span>
          <p className="mt-3 text-xs font-bold uppercase tracking-[.14em] text-gold-800">{g.cluster}</p><h3 className="mt-1 font-display text-xl font-extrabold leading-snug">{g.title}</h3><p className="mt-2 text-sm text-ink/70">{g.summary}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold">Read the guide <span className="transition group-hover:translate-x-1" aria-hidden>→</span></span></Link>))}</div></section>
  );
}

export function SocialSection({ g }: { g: SiteCfg }) {
  const list: [string, string, string][] = [["Instagram", https(g["site.instagram"]), P.ig], ["Facebook", https(g["site.facebook"]), P.fb], ["TikTok", https(g["site.tiktok"]), P.tt], ["YouTube", https(g["site.youtube"]), P.yt], ["Tripadvisor", https(g["site.tripadvisorUrl"]), P.star]];
  const on = list.filter(([, u]) => u);
  if (!on.length) return null;
  return (
    <section className="bg-[#FFF9EC] py-14"><div className="container-x text-center"><Head center eyebrow="Follow along" title="See Egypt through our travellers' eyes" sub="Trip photos, guide tips and behind-the-scenes from the team." />
      <div className="mt-7 flex flex-wrap justify-center gap-3">{on.map(([n, u, d]) => <a key={n} href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 rounded-full border border-ink/15 bg-white px-5 py-3 text-[15px] font-bold shadow-sm transition hover:-translate-y-0.5 hover:border-ink"><Icon d={d} size={20} />{n}</a>)}</div></div></section>
  );
}

export function ContactMap({ g }: { g: SiteCfg }) {
  const q = g["site.mapQuery"] || "Egypt"; const link = https(g["site.mapLink"]) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const wa = (g["company.whatsapp"] || "").replace(/\D/g, "");
  const cards: [string, string, string, string | null][] = [
    [P.chat, "WhatsApp", g["company.whatsapp"], wa ? waLink("Hi Egypt Knight, I'd like some help planning my trip.") : null],
    [P.mail, "Email", g["company.email"], g["company.email"] ? `mailto:${g["company.email"]}` : null],
    [P.phone, "Phone", g["company.phone"], g["company.phone"] ? `tel:${g["company.phone"].replace(/[^\d+]/g, "")}` : null],
    [P.clock, "Hours", g["site.hours"], null],
    ...(g["company.address"] ? [[P.pin, "Address", g["company.address"], null] as [string, string, string, string | null]] : []),
  ];
  return (
    <section className="container-x py-16"><Head eyebrow="Reach us" title="Talk to a real person" sub="Message us any time. We reply fast, and we're happy to help you choose." />
      <div className="mt-9 grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-3">{cards.filter(([, , v]) => v).map(([d, l, v, href]) => { const inner = <><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-500"><Icon d={d} size={20} /></span><span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-wide text-ink/65">{l}</span><span className="block break-words font-semibold">{v}</span></span></>; const cls = "flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_2px_10px_rgba(20,16,16,.05)]"; return href ? <a key={l} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={`${cls} transition hover:border-ink/40`}>{inner}</a> : <div key={l} className={cls}>{inner}</div>; })}
          <div className="flex flex-wrap gap-3 pt-1"><WhatsAppButton href={waLink("Hi Egypt Knight, I'd like some help planning my trip.")} label="Chat on WhatsApp" /><Link href="/contact" className="btn btn-outline">Send a message</Link></div></div>
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-[0_2px_14px_rgba(20,16,16,.07)]">
          <iframe title={`Map: ${q}`} src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block h-[320px] w-full border-0 sm:h-[380px]" />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 p-3"><p className="flex items-center gap-2 text-sm font-semibold"><Icon d={P.pin} size={18} />{q}</p><a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-[38px] !py-1.5 !text-[13px]">Open in Google Maps</a></div></div></div></section>
  );
}

export function FaqPanel({ faq }: { faq: [string, string][] }) {
  return (
    <section className="container-x pb-16"><div className="grid gap-8 rounded-[32px] bg-ink p-6 text-white sm:p-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-14"><div><Head light eyebrow="Questions" title="Good to know before you book" sub="Quick answers to what people ask us most." /><Link href="/faq" className="mt-6 inline-flex text-sm font-bold text-gold-500 underline decoration-2 underline-offset-4">See all questions</Link></div>
      <div className="divide-y divide-white/15">{faq.map(([q, a]) => <details key={q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold">{q}<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink transition group-open:rotate-45" aria-hidden>+</span></summary><p className="mt-3 text-[15px] leading-relaxed text-white/70">{a}</p></details>)}</div></div></section>
  );
}
