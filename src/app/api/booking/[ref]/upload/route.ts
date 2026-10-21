import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { verifyRef } from "@/lib/booking-token";
import { rateLimitPersistent, clientIp } from "@/lib/rate-limit";
import { saveCustomerUpload } from "@/lib/uploads";
import { MAX_UPLOAD_BYTES } from "@/lib/customer-uploads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const no = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

// The customer uploads a passport, a payment receipt or a requested file from their booking page. Only someone holding the
// booking's private link (its signed token) can upload; every request, traveler and file type is checked again in
// saveCustomerUpload. Staff are told by email and see it in the order window.
export async function POST(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params; const t = new URL(req.url).searchParams.get("t");
  if (!verifyRef(ref, t)) return no("This link isn't valid. Open your booking from the link we sent you.", 403);
  const ip = clientIp(req.headers);
  if (!(await rateLimitPersistent(`upload-ip:${ip}`, 40, 3600_000)) || !(await rateLimitPersistent(`upload-ref:${ref}`, 40, 3600_000))) return no("Too many uploads. Please wait a little and try again.", 429);
  const len = Number(req.headers.get("content-length") ?? 0); if (len > MAX_UPLOAD_BYTES + 200_000) return no("That file is too big. Please send one under 4 MB, or a photo instead.", 413);
  const [b] = await db.select({ id: s.bookings.id }).from(s.bookings).where(eq(s.bookings.ref, ref)); if (!b) return no("We couldn't find this booking.", 404);
  const fd = await req.formData().catch(() => null); const file = fd?.get("file");
  if (!(file instanceof File)) return no("No file was received. Please choose it again.");
  const amount = Number(String(fd?.get("amount") ?? "").replace(/,/g, ""));
  const r = await saveCustomerUpload({ bookingId: b.id, requestId: String(fd?.get("requestId") ?? ""), travelerId: String(fd?.get("travelerId") ?? "") || null,
    file: { name: file.name, size: file.size, bytes: Buffer.from(await file.arrayBuffer()) }, note: String(fd?.get("note") ?? ""), amount: Number.isFinite(amount) ? amount : null });
  if (!r.ok) return no(r.message);
  const { notifyCustomerUpload } = await import("@/lib/notifications"); await notifyCustomerUpload(b.id, r.label);
  return NextResponse.json({ ok: true, message: "Thank you! We received it and will check it shortly." }, { headers: { "Cache-Control": "no-store" } });
}
