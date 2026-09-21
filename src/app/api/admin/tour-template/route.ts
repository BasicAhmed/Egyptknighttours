import { NextResponse } from "next/server";
import { getSession, PERMS } from "@/lib/auth";
import { TOUR_TEMPLATE } from "@/lib/import-tours";
export const dynamic = "force-dynamic";
export async function GET() {
  const u = await getSession(); if (!u || !PERMS.tours.includes(u.role)) return new NextResponse("Not found", { status: 404 });
  return new NextResponse("\uFEFF" + TOUR_TEMPLATE, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="tours-import-template.csv"', "Cache-Control": "no-store" } });
}
