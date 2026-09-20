import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { getSession, PERMS } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sniffMime } from "@/lib/travelers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX = 4_200_000; // request bodies on Vercel are limited to about 4.5 MB (the browser shrinks photos first)

// Staff upload a website photo. Returns a path like /api/media/<id> that can be saved on a tour, destination or itinerary.
export async function POST(req: Request) {
  const u = await getSession();
  const ok = u && [...PERMS.tours, ...PERMS.itineraries, ...PERMS.settings].includes(u.role);
  if (!u || !ok) return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 401 });
  if (!rateLimit("media:" + u.uid, 80, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Too many uploads. Wait a few minutes." }, { status: 429 });
  const fd = await req.formData().catch(() => null); const file = fd?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file received" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: `That photo is ${(file.size / 1e6).toFixed(1)} MB. Try a smaller one.` }, { status: 413 });
  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || mime === "application/pdf") return NextResponse.json({ ok: false, error: "Please upload a JPG, PNG or WebP photo." }, { status: 400 });
  let outMime = mime; let width: number | null = null; let height: number | null = null;
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    buf = out.data; outMime = "image/webp"; width = out.info.width; height = out.info.height;
  } catch { /* keep the original if image processing isn't available */ }
  const name = (file.name || "photo").replace(/[^\w.\- ()]+/g, "_").slice(0, 100);
  const [row] = await db.insert(s.media).values({ filename: name, mime: outMime, size: buf.length, width, height, data: buf, uploadedById: u.uid }).returning({ id: s.media.id });
  return NextResponse.json({ ok: true, id: row.id, url: `/api/media/${row.id}`, width, height });
}
