import type { MetadataRoute } from "next";
import { listTours, allDestinations, publishedGuides } from "@/lib/queries";
import { SITE } from "@/lib/format";
import { LANDINGS } from "@/lib/landing";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [t, d, g] = await Promise.all([listTours({}, 1000), allDestinations(), publishedGuides()]);
  const fixed = ["", "/tours", "/destinations", "/egypt-travel-guide", "/plan-my-trip", "/contact", "/faq", "/terms", "/privacy-policy"].map((p) => ({ url: SITE + p, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));
  const landings = LANDINGS.map((l) => ({ url: `${SITE}/egypt-tours/${l.slug}`, changeFrequency: "weekly" as const, priority: 0.8 }));
  return [...fixed, ...landings, ...t.map((x) => ({ url: `${SITE}/tours/${x.slug}`, lastModified: x.updatedAt, priority: 0.9 })), ...d.map((x) => ({ url: `${SITE}/destinations/${x.slug}`, priority: 0.8 })), ...g.map((x) => ({ url: `${SITE}/egypt-travel-guide/${x.slug}`, lastModified: x.updatedAt, priority: 0.7 }))];
}
