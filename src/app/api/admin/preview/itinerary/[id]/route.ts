import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { renderItinerary } from "@/pdf/render";
import { prepareImages } from "@/pdf/images";
import { pdfResponse } from "@/lib/pdf-response";
import { itineraryPdfData, itineraryImageUrls } from "@/lib/documents";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const [it] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, id));
  if (!it) return new NextResponse("Not found", { status: 404 });
  // The preview is the customer's copy: the same data the stored PDF is made from, price shown or hidden by the same rule.
  const data = await itineraryPdfData(it);
  return pdfResponse(async () => renderItinerary({ ...data, images: await prepareImages(itineraryImageUrls(data.content)) }), `preview-${it.name.replace(/[^a-z0-9]+/gi, "-")}.pdf`, true);
}
