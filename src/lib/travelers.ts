import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";

// Makes sure an order has one traveler row per person (adults, children, infants) so staff can fill in details for everyone.
export async function syncTravelers(bookingId: string) {
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId)); if (!b) return 0;
  const have = await db.select().from(s.travelers).where(eq(s.travelers.bookingId, bookingId));
  const want: [string, number][] = [["ADULT", b.adults], ["CHILD", b.children], ["INFANT", b.infants]]; let added = 0; let n = have.length;
  for (const [type, count] of want) {
    const cur = have.filter((t) => t.type === type).length;
    for (let i = cur; i < count; i++) { n++; added++; await db.insert(s.travelers).values({ bookingId, fullName: `Traveler ${n}`, type }); }
  }
  return added;
}

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
export function sniffMime(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}
