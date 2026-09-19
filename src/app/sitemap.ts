import type { MetadataRoute } from "next";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { SITE } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [t, d, g] = await Promise.all([db.select().from(s.tours).where(eq(s.tours.status, "PUBLISHED")), db.select().from(s.destinations), db.select().from(s.guides).where(eq(s.guides.status, "PUBLISHED"))]);
  const fixed = ["", "/tours", "/destinations", "/egypt-travel-guide", "/plan-my-trip", "/contact", "/faq"].map((p) => ({ url: SITE + p, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));
  return [...fixed, ...t.map((x) => ({ url: `${SITE}/tours/${x.slug}`, lastModified: x.updatedAt, priority: 0.9 })), ...d.map((x) => ({ url: `${SITE}/destinations/${x.slug}`, priority: 0.8 })), ...g.map((x) => ({ url: `${SITE}/egypt-travel-guide/${x.slug}`, lastModified: x.updatedAt, priority: 0.7 }))];
}
