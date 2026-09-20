import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const WIDTHS = [480, 800, 1200, 1600];
// Public photos. The id never changes for a given image, so browsers and the CDN can keep it for a year.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m] = await db.select().from(s.media).where(eq(s.media.id, id)); if (!m) return new NextResponse("Not found", { status: 404 });
  let bytes: Buffer = Buffer.from(m.data); let mime = m.mime;
  const w = Number(new URL(req.url).searchParams.get("w"));
  if (WIDTHS.includes(w) && (m.width ?? 9999) > w) {
    try { const sharp = (await import("sharp")).default; bytes = await sharp(bytes).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(); mime = "image/webp"; } catch { /* serve the original */ }
  }
  return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
