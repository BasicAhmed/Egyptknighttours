import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getSettings, companyFrom } from "@/lib/settings";
import { renderItinerary } from "@/pdf/render";
import { prepareImages } from "@/pdf/images";
import { parseJson } from "@/lib/format";
import type { ItineraryContent } from "@/pdf/types";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const [it] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, id));
  if (!it) return new NextResponse("Not found", { status: 404 });
  const content = parseJson<ItineraryContent>(it.content, null as never);
  const urls = [content.coverImageUrl, ...content.days.flatMap((d) => [d.imageUrl, ...d.blocks.map((b) => b.imageUrl)])].filter(Boolean);
  const g = await getSettings();
  const buf = await renderItinerary({ content, ref: `IT-${it.id.slice(0, 6).toUpperCase()}`, company: companyFrom(g), ctaUrl: content.ctaUrl, generatedAt: new Date().toISOString(), images: await prepareImages(urls) });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="preview-${it.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`, "Cache-Control": "no-store" } });
}
