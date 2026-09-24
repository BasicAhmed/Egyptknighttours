import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildCorporateInvoiceData } from "@/lib/corporate";
import { renderCorporateInvoice } from "@/pdf/render";
import { pdfResponse } from "@/lib/pdf-response";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const data = await buildCorporateInvoiceData(id);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return pdfResponse(() => renderCorporateInvoice(data), `${data.ref}-invoice.pdf`, true);
}
