import { NextResponse } from "next/server";
// Returns the PDF, or a readable message if generation fails (instead of an empty white page).
export async function pdfResponse(make: () => Promise<Buffer>, filename: string, inline: boolean) {
  try {
    const buf = await make();
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename.replace(/"/g, "")}"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("PDF generation failed:", e);
    return new NextResponse(`We couldn't create this PDF.\n\nReason: ${String((e as Error)?.message ?? e).slice(0, 300)}\n\nPlease send this message to your developer.`, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
