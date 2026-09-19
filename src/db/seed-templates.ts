import { db, schema as s } from "./index";
import { eq } from "drizzle-orm";
import { TEMPLATES } from "../lib/itinerary-templates";

// Adds the starter itinerary templates once. Runs for new and existing databases.
export async function seedItineraryTemplates() {
  const ex = await db.select({ id: s.itineraries.id }).from(s.itineraries).where(eq(s.itineraries.isTemplate, true)).limit(1);
  if (ex.length) return;
  for (const t of TEMPLATES) await db.insert(s.itineraries).values({ name: t.name, description: t.description, isTemplate: true, content: JSON.stringify(t.content) });
}
