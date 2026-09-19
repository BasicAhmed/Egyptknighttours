import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { getSession, PERMS } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { extractPdfText, parseItineraryText } from "@/lib/pdf-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX = 4_000_000; // Vercel accepts request bodies up to about 4.5 MB

// Turns an uploaded itinerary PDF into an editable itinerary (or template). One file per request.
export async function POST(req: Request) {
  const u = await getSession();
  if (!u || !PERMS.itineraries.includes(u.role)) return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 401 });
  if (!rateLimit("import:" + u.uid, 60, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Too many imports. Wait a few minutes." }, { status: 429 });
  const fd = await req.formData().catch(() => null); const file = fd?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file received" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: `This PDF is ${(file.size / 1e6).toFixed(1)} MB. The limit is 4 MB. Try compressing it first.` }, { status: 413 });
  const buf = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") return NextResponse.json({ ok: false, error: "This file isn't a PDF." }, { status: 400 });
  let text: string;
  try { text = (await extractPdfText(buf)).text; } catch (e) { console.error("PDF import read failed", e); return NextResponse.json({ ok: false, error: "Couldn't read this PDF. It may be damaged or password protected." }, { status: 422 }); }
  if (text.replace(/\s/g, "").length < 40) return NextResponse.json({ ok: false, error: "This PDF has no readable text (it looks like a scan or images). Import works with text PDFs." }, { status: 422 });
  const asTemplate = fd?.get("asTemplate") === "1";
  const r = parseItineraryText(text, file.name);
  const [it] = await db.insert(s.itineraries).values({ name: r.name.slice(0, 120), description: `Imported from ${file.name}. Please review the headlines and details.`.slice(0, 300), isTemplate: asTemplate, content: JSON.stringify(r.content), createdById: u.uid }).returning();
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "IMPORT", entity: "itinerary", entityId: it.id });
  return NextResponse.json({ ok: true, id: it.id, name: r.name, isTemplate: asTemplate, report: r.report });
}
