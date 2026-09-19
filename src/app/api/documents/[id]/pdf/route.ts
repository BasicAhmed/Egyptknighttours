import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { verifyDoc } from "@/lib/booking-token";
import { getSession } from "@/lib/auth";
import { renderDocument } from "@/lib/documents";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { pdfResponse } from "@/lib/pdf-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Staff (signed in) or anyone holding the signed link can download a generated document.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const url = new URL(req.url);
  const staff = await getSession();
  if (!staff && !verifyDoc(id, url.searchParams.get("t"))) return new NextResponse("Not found", { status: 404 });
  if (!rateLimit("pdf:" + clientIp(req.headers), 40, 60_000)) return new NextResponse("Too many requests", { status: 429 });
  const [doc] = await db.select().from(s.documents).where(eq(s.documents.id, id));
  if (!doc) return new NextResponse("Not found", { status: 404 });
  if (!staff && !doc.sentAt) return new NextResponse("Not found", { status: 404 }); // customers only see documents that were sent to them
  return pdfResponse(() => renderDocument(doc), `${doc.number}.pdf`, url.searchParams.get("inline") === "1");
}
