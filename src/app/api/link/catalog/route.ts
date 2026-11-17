// For The Royal Nile Residence (signed requests only): the tours and service types it can book for its guests.
import { client } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { readLinked } from "@/lib/link";
import { SERVICE_TYPES } from "@/lib/corporate-constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const r = await readLinked(req); if (!r.ok) return r.res;
  await ensureDatabase();
  const rows = (await client.execute(`SELECT t.id, t.title, t.price, t.discount_price, t.pricing_model, t.duration_days, d.name AS destination
    FROM tours t LEFT JOIN destinations d ON d.id = t.destination_id WHERE t.status = 'PUBLISHED' ORDER BY (d.name = 'Aswan') DESC, d.name, t.popularity DESC, t.title LIMIT 200`)).rows;
  const tours = rows.map((x) => ({ id: String(x.id), title: String(x.title), price: Number(x.discount_price ?? x.price ?? 0), perPerson: String(x.pricing_model) !== "PER_GROUP", days: Number(x.duration_days ?? 1), destination: String(x.destination ?? "") }));
  // Hotels are what the residence itself offers, so that type isn't listed.
  return Response.json({ tours, serviceTypes: SERVICE_TYPES.filter(([k]) => k !== "HOTEL") });
}
