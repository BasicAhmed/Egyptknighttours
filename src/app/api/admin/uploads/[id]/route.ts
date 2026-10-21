import { NextResponse } from "next/server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { getSession, PERMS } from "@/lib/auth";
import { decryptBuffer } from "@/lib/crypto";

export const dynamic = "force-dynamic";
const deny = () => new NextResponse("Not found", { status: 404 });

// Staff only: view a file a customer uploaded, to check it. Every view is written to the audit log, like passport files.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getSession(); if (!u || !PERMS.bookings.includes(u.role)) return deny();
  const { id } = await params; const [f] = await db.select().from(s.customerUploads).where(eq(s.customerUploads.id, id)); if (!f) return deny();
  if (!f.data || !Buffer.from(f.data).length) return new NextResponse(f.status === "APPROVED" && f.kind === "PASSPORT" ? "This passport was confirmed and moved to the traveler's Passport section." : "This file was not accepted and has been deleted.", { status: 410 });
  let bytes: Buffer; try { bytes = decryptBuffer(Buffer.from(f.data)); } catch { return new NextResponse("This file can't be decrypted. The encryption key may have changed.", { status: 500 }); }
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "VIEW_FILE", entity: "customer_upload", entityId: id });
  const dl = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": f.mime, "Content-Disposition": `${dl ? "attachment" : "inline"}; filename="${f.filename.replace(/"/g, "")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
}
