import { db, schema as s } from "@/db";
import { and, asc, desc, eq, gte, lte, sql, inArray, like, or } from "drizzle-orm";

export type Filters = { destination?: string; category?: string; audience?: string; type?: string; maxPrice?: number; minDays?: number; maxDays?: number; sort?: string; q?: string };

export async function getRatings(tourIds: string[]) {
  if (!tourIds.length) return new Map<string, { avg: number; count: number }>();
  const rows = await db.select({ tourId: s.reviews.tourId, avg: sql<number>`avg(${s.reviews.rating})`, count: sql<number>`count(*)` })
    .from(s.reviews).where(and(inArray(s.reviews.tourId, tourIds), eq(s.reviews.status, "APPROVED"))).groupBy(s.reviews.tourId);
  return new Map(rows.map((r) => [r.tourId, { avg: Number(r.avg), count: Number(r.count) }]));
}

export async function listTours(f: Filters = {}, limit = 60) {
  const conds = [eq(s.tours.status, "PUBLISHED")];
  if (f.destination) conds.push(eq(s.destinations.slug, f.destination));
  if (f.category) conds.push(eq(s.tours.category, f.category));
  if (f.audience) conds.push(or(eq(s.tours.audience, f.audience), eq(s.tours.audience, "ALL"))!);
  if (f.type === "private") conds.push(eq(s.tours.isPrivateAvailable, true));
  if (f.type === "group") conds.push(and(eq(s.tours.isGroupAvailable, true), eq(s.tours.pricingModel, "PER_PERSON"))!);
  if (f.maxPrice) conds.push(lte(sql`coalesce(${s.tours.discountPrice}, ${s.tours.price})`, f.maxPrice));
  if (f.minDays) conds.push(gte(s.tours.durationDays, f.minDays));
  if (f.maxDays) conds.push(lte(s.tours.durationDays, f.maxDays));
  if (f.q) conds.push(or(like(s.tours.title, `%${f.q}%`), like(s.tours.shortDescription, `%${f.q}%`))!);
  const order = f.sort === "price-asc" ? asc(sql`coalesce(${s.tours.discountPrice}, ${s.tours.price})`) : f.sort === "price-desc" ? desc(sql`coalesce(${s.tours.discountPrice}, ${s.tours.price})`) : desc(s.tours.popularity);
  const rows = await db.select({ t: s.tours, destinationName: s.destinations.name, destinationSlug: s.destinations.slug, destinationImage: s.destinations.imageUrl })
    .from(s.tours).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id)).where(and(...conds)).orderBy(order).limit(limit);
  const ratings = await getRatings(rows.map((r) => r.t.id));
  return rows.map((r) => ({ ...r.t, destinationName: r.destinationName, destinationSlug: r.destinationSlug, destinationImage: r.destinationImage, rating: ratings.get(r.t.id) ?? null }));
}

export async function getTourBySlug(slug: string) {
  const [row] = await db.select({ t: s.tours, dest: s.destinations }).from(s.tours).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id))
    .where(and(eq(s.tours.slug, slug), eq(s.tours.status, "PUBLISHED")));
  if (!row) return null;
  const addons = await db.select().from(s.addons).where(and(eq(s.addons.tourId, row.t.id), eq(s.addons.active, true)));
  const reviews = await db.select().from(s.reviews).where(and(eq(s.reviews.tourId, row.t.id), eq(s.reviews.status, "APPROVED"))).orderBy(desc(s.reviews.createdAt)).limit(20);
  const rating = reviews.length ? { avg: reviews.reduce((a, r) => a + r.rating, 0) / reviews.length, count: reviews.length } : null;
  return { tour: row.t, dest: row.dest, addons, reviews, rating };
}
