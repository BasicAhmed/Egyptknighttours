import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
// The placeholder tour every custom order sits on (staff "+ New order" custom experiences, AI planner trips). Archived, so it
// never shows on the website; the order's own title is what everyone sees.
export async function ensureCustomTour() {
  const [ex] = await db.select().from(s.tours).where(eq(s.tours.slug, "custom-experience")); if (ex) return ex.id;
  const [d] = await db.select().from(s.destinations).limit(1);
  const [t] = await db.insert(s.tours).values({ slug: "custom-experience", title: "Custom experience", shortDescription: "Created by staff for a specific customer.", longDescription: "Custom experience created by staff.", destinationId: d.id, category: "MULTI_DAY", price: 0, status: "ARCHIVED", isPrivateAvailable: true }).returning();
  return t.id;
}
