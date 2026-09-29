import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSettings, companyFrom } from "./settings";
import { parseJson, SITE, tourNights, money } from "./format";
import { blankItinerary, blk, day as newDay } from "./itinerary-templates";
import { prepareImages } from "@/pdf/images";
import { renderItinerary } from "@/pdf/render";
import type { ItineraryContent } from "@/pdf/types";

const SCENES = new Set(["giza", "cairo", "luxor", "aswan", "alexandria", "hurghada"]);
const stripDay = (t: string) => t.replace(/^\s*day\s*\d+\s*[:\-–—.]?\s*/i, "").trim();

// Turns a website tour into the same branded itinerary PDF customers get for a custom trip: the tour's own photo on the
// cover (the one shown on the website, or the destination photo when the tour has none), its length, highlights,
// day-by-day plan, included / not included, starting price and a "Book this tour" button back to the website.
export function tourToItinerary(t: typeof s.tours.$inferSelect, dest: typeof s.destinations.$inferSelect): ItineraryContent {
  const steps = parseJson<{ title: string; text: string }[]>(t.itinerary, []).filter((x) => x.title || x.text);
  const multi = t.durationDays > 1;
  // Multi-day tours: each itinerary entry is a day. Day tours: one day, each entry is a stop on its timeline.
  const days = multi && steps.length
    ? steps.map((x, i) => newDay(stripDay(x.title) || `Day ${i + 1}`, x.text, "", []))
    : [newDay(t.title, t.shortDescription, dest.name, steps.map((x) => blk("ACTIVITY", "", stripDay(x.title), x.text)))];
  const price = t.discountPrice ?? t.price;
  return {
    ...blankItinerary(),
    title: t.title, subtitle: t.shortDescription, intro: t.longDescription.slice(0, 1800),
    coverImageUrl: t.imageUrl || dest.imageUrl || "", sceneKind: SCENES.has(dest.slug) ? dest.slug : "auto",
    destinations: [dest.name], highlights: parseJson<string[]>(t.highlights, []), days,
    included: parseJson<string[]>(t.included, []), excluded: parseJson<string[]>(t.excluded, []),
    important: [t.pickupInfo && `Pickup: ${t.pickupInfo}`, t.meetingPoint && `Meeting point: ${t.meetingPoint}`, t.whatToBring && `What to bring: ${t.whatToBring}`, t.cancellationPolicy && `Cancellation: ${t.cancellationPolicy}`].filter(Boolean) as string[],
    priceLabel: price > 0 ? `From ${money(price)} ${t.pricingModel === "PER_GROUP" ? "per group" : "per person"}` : "",
    paymentTerms: "Private and group options available. Final price depends on your date and group size.",
    ctaUrl: `${SITE}/book/${t.slug}`, ctaLabel: "Book this tour",
    durationDays: t.durationDays, durationNights: multi || (t.durationNights ?? 0) > 0 ? tourNights(t) : 0,
  };
}

// Rendered PDFs are cached per tour version, so a popular tour's download doesn't re-fetch photos and re-render every time.
const cache = new Map<string, { key: string; buf: Buffer }>();
export async function renderTourPdf(slug: string, opts: { includeUnpublished?: boolean } = {}): Promise<{ buf: Buffer; filename: string } | null> {
  const where = opts.includeUnpublished ? eq(s.tours.slug, slug) : and(eq(s.tours.slug, slug), eq(s.tours.status, "PUBLISHED"));
  const [row] = await db.select({ t: s.tours, dest: s.destinations }).from(s.tours).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id)).where(where);
  if (!row) return null;
  const g = await getSettings(); const company = companyFrom(g);
  const key = `${row.t.updatedAt?.getTime() ?? 0}:${row.dest.imageUrl ?? ""}:${JSON.stringify(company)}`;
  const filename = `${row.t.slug}-itinerary.pdf`;
  const hit = cache.get(row.t.id); if (hit && hit.key === key) return { buf: hit.buf, filename };
  const content = tourToItinerary(row.t, row.dest);
  const buf = await renderItinerary({ content, ref: `TOUR-${row.t.id.slice(0, 6).toUpperCase()}`, company, ctaUrl: content.ctaUrl, generatedAt: new Date().toISOString(), images: await prepareImages([content.coverImageUrl].filter(Boolean)) });
  if (cache.size > 30) cache.delete(cache.keys().next().value!);
  cache.set(row.t.id, { key, buf });
  return { buf, filename };
}
