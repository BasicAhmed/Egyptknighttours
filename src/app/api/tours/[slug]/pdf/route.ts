import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { renderTourPdf } from "@/lib/tour-pdf";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "Download itinerary" for a tour. Anyone can download a published tour; logged-in staff can also download drafts.
// ?view=1 opens it in the browser instead of downloading (used by the admin "Preview" link).
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const staff = !!(await getSession());
  if (!staff && !rateLimit("tourpdf:" + clientIp(await headers()), 20, 10 * 60_000)) return new NextResponse("Too many downloads. Please try again in a few minutes.", { status: 429 });
  try {
    const r = await renderTourPdf(slug, { includeUnpublished: staff });
    if (!r) return new NextResponse("Tour not found", { status: 404 });
    const inline = new URL(req.url).searchParams.get("view") === "1";
    return new NextResponse(new Uint8Array(r.buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${r.filename.replace(/"/g, "")}"`, "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    console.error("Tour PDF failed:", e);
    return new NextResponse("We couldn't create this PDF right now. Please try again, or message us on WhatsApp for the itinerary.", { status: 500 });
  }
}
