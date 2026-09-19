import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildInvoiceData } from "@/lib/invoice";
import { renderInvoice } from "@/pdf/render";
import { pdfResponse } from "@/lib/pdf-response";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  if (!(await getSession())) return new NextResponse("Unauthorized", { status: 401 });
  const { bookingId } = await params; const q = new URL(req.url).searchParams;
  const data = await buildInvoiceData(bookingId, { currency: q.get("currency") || undefined, dueNow: q.get("dueNow") ? Number(q.get("dueNow")) : undefined, deadline: q.get("deadline") || undefined });
  if (!data) return new NextResponse("Not found", { status: 404 });
  return pdfResponse(() => renderInvoice(data), `preview-${data.ref}.pdf`, true);
}
