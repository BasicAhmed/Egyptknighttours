import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { getSession, PERMS } from "@/lib/auth";
import { decryptBuffer } from "@/lib/crypto";

export const dynamic = "force-dynamic";
const deny = () => new NextResponse("Not found", { status: 404 });

// Staff only. Every view or download is written to the audit log.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getSession(); if (!u || !PERMS.bookings.includes(u.role)) return deny();
  const { id } = await params; const [f] = await db.select().from(s.travelerFiles).where(eq(s.travelerFiles.id, id)); if (!f) return deny();
  let bytes: Buffer; try { bytes = decryptBuffer(Buffer.from(f.data)); } catch { return new NextResponse("This file can't be decrypted. The encryption key may have changed.", { status: 500 }); }
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "VIEW_FILE", entity: "traveler_file", entityId: id });
  const dl = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": f.mime, "Content-Disposition": `${dl ? "attachment" : "inline"}; filename="${f.filename.replace(/"/g, "")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getSession(); if (!u || !PERMS.bookings.includes(u.role)) return deny();
  const { id } = await params; await db.delete(s.travelerFiles).where(eq(s.travelerFiles.id, id));
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "DELETE_FILE", entity: "traveler_file", entityId: id });
  return NextResponse.json({ ok: true });
}
