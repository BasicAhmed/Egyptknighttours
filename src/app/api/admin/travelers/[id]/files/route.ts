import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { getSession, PERMS } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { encryptBuffer } from "@/lib/crypto";
import { sniffMime, IMAGE_MIME } from "@/lib/travelers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX = 4_000_000; // request bodies on Vercel are limited to about 4.5 MB

// Upload a passport / visa scan for one traveler. Stored encrypted, never public.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getSession();
  if (!u || !PERMS.bookings.includes(u.role)) return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 401 });
  if (!rateLimit("upload:" + u.uid, 60, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Too many uploads. Wait a few minutes." }, { status: 429 });
  const { id } = await params;
  const [t] = await db.select().from(s.travelers).where(eq(s.travelers.id, id)); if (!t) return NextResponse.json({ ok: false, error: "Traveler not found" }, { status: 404 });
  const fd = await req.formData().catch(() => null); const file = fd?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file received" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: `That file is ${(file.size / 1e6).toFixed(1)} MB. The limit is 4 MB.` }, { status: 413 });
  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf); if (!mime) return NextResponse.json({ ok: false, error: "Please upload a JPG, PNG, WebP or PDF file." }, { status: 400 });
  let outMime = mime;
  if (IMAGE_MIME.includes(mime)) { // shrink big phone photos and drop hidden location data
    try { const sharp = (await import("sharp")).default; buf = await sharp(buf).rotate().resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(); outMime = "image/jpeg"; } catch { /* keep the original */ }
  }
  const kind = ["PASSPORT", "VISA", "OTHER"].includes(String(fd?.get("kind"))) ? String(fd?.get("kind")) : "PASSPORT";
  const name = (file.name || "upload").replace(/[^\w.\- ()]+/g, "_").slice(0, 100);
  const [row] = await db.insert(s.travelerFiles).values({ travelerId: id, bookingId: t.bookingId, kind, filename: outMime === "image/jpeg" && !/\.jpe?g$/i.test(name) ? name.replace(/\.[^.]+$/, "") + ".jpg" : name, mime: outMime, size: buf.length, data: encryptBuffer(buf), uploadedById: u.uid }).returning({ id: s.travelerFiles.id });
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "UPLOAD_FILE", entity: "traveler_file", entityId: row.id });
  return NextResponse.json({ ok: true, id: row.id });
}
