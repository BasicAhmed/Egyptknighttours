import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { csvObjects, parseMoney, slugify, splitList } from "./csv";
import { downloadImage } from "./import-images";
import { sniffMime } from "./travelers";

export const TOUR_TEMPLATE = ["title", "slug", "destination", "category", "price", "discount_price", "duration_days", "duration_hours", "short_description", "description", "highlights", "included", "excluded", "itinerary", "image_url", "meeting_point", "pickup_info", "private", "pricing"].join(",") + "\n" +
  '"Giza Pyramids and Sphinx Day Tour","giza-pyramids-sphinx-day-tour","Giza","day",55,,1,6,"The big three, planned so you skip the worst of the crowds.","A private or shared day at the pyramids with an Egyptologist guide.","Great Pyramid|Sphinx|Panoramic viewpoint","Hotel pickup|Egyptologist guide|Bottled water","Entrance to the pyramids|Lunch|Tips","Morning: Pyramids and Sphinx: Meet your guide and explore the plateau|Afternoon: Panoramic viewpoint: Photos and a break","https://your-old-site.com/wp-content/uploads/giza.jpg","We meet you at your hotel lobby","Pickup between 7:00 and 8:00 am",yes,per person\n';

export type ImportResult = { created: string[]; skipped: string[]; warnings: string[] };
const truthy = (v: string, d: boolean) => (v ? /^(y|yes|true|1)$/i.test(v.trim()) : d);

async function ensureDestination(name: string, cache: Map<string, string>): Promise<string> {
  const key = slugify(name); if (cache.has(key)) return cache.get(key)!;
  const found = (await db.select().from(s.destinations).where(eq(s.destinations.slug, key)))[0]; if (found) { cache.set(key, found.id); return found.id; }
  const [d] = await db.insert(s.destinations).values({
    slug: key, name: name.trim(), tagline: `${name.trim()} tours and things to do`,
    overview: `Explore ${name.trim()} with a local team. Browse the ${name.trim()} tours below, or tell us what you would like and we will build it around you.`,
    bestTime: `Ask us for the best time to visit ${name.trim()} on your dates.`, howToGet: `We arrange pickups and transfers for every tour.`, whereToStay: `Tell us your budget and we will suggest hotels.`, tips: `Message us on WhatsApp for local tips.`,
    recommendedDays: "Ask us", seoTitle: `${name.trim()} Tours and Things to Do`.slice(0, 70), seoDescription: `Book tours in ${name.trim()} with a local team. Clear prices, private or shared, and easy booking.`.slice(0, 165),
  }).returning(); cache.set(key, d.id); return d.id;
}

export async function importTours(csv: string, o: { imageHosts: string[]; skipImages: boolean; company: string; userId: string; max?: number }): Promise<ImportResult> {
  const out: ImportResult = { created: [], skipped: [], warnings: [] };
  const rows = csvObjects(csv).slice(0, o.max ?? 40); if (!rows.length) { out.skipped.push("No rows found. The first line must be the column names."); return out; }
  const have = new Set((await db.select({ slug: s.tours.slug }).from(s.tours)).map((t) => t.slug)); const dcache = new Map<string, string>();
  for (const [i, r] of rows.entries()) {
    const label = r.title || `Row ${i + 2}`;
    const title = (r.title ?? "").trim(); const price = parseMoney(r.price ?? "");
    if (title.length < 3) { out.skipped.push(`Row ${i + 2}: missing title`); continue; }
    if (price === null || price < 0) { out.skipped.push(`${label}: missing or invalid price`); continue; }
    if (!(r.destination ?? "").trim()) { out.skipped.push(`${label}: missing destination`); continue; }
    let slug = slugify(r.slug || title); if (have.has(slug)) { out.skipped.push(`${label}: a tour with the address "${slug}" already exists, so it was left untouched`); continue; }
    have.add(slug);
    const days = Math.max(1, Math.round(Number(r.duration_days) || 1)); const hours = Math.max(1, Math.round(Number(r.duration_hours) || (days > 1 ? 24 : 6)));
    const catIn = (r.category ?? "").toLowerCase(); const category = /cruise/.test(catIn + " " + title.toLowerCase()) && days > 1 ? "NILE_CRUISE" : /transfer/.test(catIn) ? "TRANSFER" : days > 1 || /multi|package/.test(catIn) ? "MULTI_DAY" : "DAY";
    const perGroup = /group/i.test(r.pricing ?? ""); const dest = await ensureDestination(r.destination, dcache);
    let imageUrl: string | null = null; const firstImage = splitList(r.image_url ?? "")[0];
    if (firstImage && !o.skipImages) {
      try {
        let buf = await downloadImage(firstImage, o.imageHosts); const mime = sniffMime(buf); if (!mime || mime === "application/pdf") throw new Error("not a JPG, PNG or WebP photo");
        let width: number | null = null, height: number | null = null, outMime = mime;
        try { const sharp = (await import("sharp")).default; const x = await sharp(buf).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true }); buf = x.data; outMime = "image/webp"; width = x.info.width; height = x.info.height; } catch { /* keep the original */ }
        const [m] = await db.insert(s.media).values({ filename: slug + ".webp", mime: outMime, size: buf.length, width, height, data: buf, uploadedById: o.userId }).returning({ id: s.media.id }); imageUrl = `/api/media/${m.id}`;
      } catch (e) { out.warnings.push(`${label}: photo not imported (${(e as Error).message})`); }
    } else if (firstImage && o.skipImages) out.warnings.push(`${label}: photo skipped, add it in the tour page`);
    const short = (r.short_description || r.description || title).slice(0, 300); const long = (r.description || short).slice(0, 8000);
    const itinerary = splitList(r.itinerary ?? "").map((x, k) => { const m = /^([^:]{2,80}):\s*(.+)$/.exec(x); return m ? { title: m[1].trim(), text: m[2].trim().slice(0, 900) } : { title: `Day ${k + 1}`, text: x.slice(0, 900) }; });
    await db.insert(s.tours).values({
      slug, title: title.slice(0, 160), shortDescription: short, longDescription: long, destinationId: dest, category, durationDays: days, durationHours: hours, price, discountPrice: parseMoney(r.discount_price ?? ""), pricingModel: perGroup ? "PER_GROUP" : "PER_PERSON",
      isPrivateAvailable: truthy(r.private ?? "", true), isGroupAvailable: !perGroup, highlights: JSON.stringify(splitList(r.highlights ?? "")), itinerary: JSON.stringify(itinerary), included: JSON.stringify(splitList(r.included ?? "")), excluded: JSON.stringify(splitList(r.excluded ?? "")),
      pickupInfo: (r.pickup_info || "Pickup is arranged for your tour. We confirm the exact time after you book.").slice(0, 400), meetingPoint: (r.meeting_point || "We meet you at your hotel or the agreed meeting point. Details are sent on WhatsApp.").slice(0, 400), whatToBring: "Comfortable shoes, sun hat, sunscreen and water.",
      cancellationPolicy: "See the cancellation policy in our booking terms.", imageUrl, seoTitle: `${title} | ${o.company}`.slice(0, 70), seoDescription: `${short}. Book direct with ${o.company}.`.slice(0, 168), status: "DRAFT", audience: "ALL", activityLevel: "EASY", maxTravelers: 12, faqs: "[]", updatedAt: new Date(),
    });
    out.created.push(title);
  }
  return out;
}
