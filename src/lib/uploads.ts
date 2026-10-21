import { db, schema as s } from "@/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { encryptBuffer } from "./crypto";
import { sniffMime, IMAGE_MIME, syncTravelers } from "./travelers";
import { uploadKindFor, uploadProblem, passportsComplete, parseRejectReason, parseReceiptAmount, UPLOAD_KIND_LABEL, type UploadKind, type UploadRow, type TravelerRow } from "./customer-uploads";

// ---------- Customer uploads: storing, confirming, rejecting (rules in customer-uploads.ts) ----------
// Every step is written to the order's history and the audit log. Nothing here trusts the booking page: the request,
// the traveler and the file type are all checked again on the server.

const EMPTY = Buffer.alloc(0);
const event = (bookingId: string, note: string) => db.insert(s.bookingEvents).values({ bookingId, type: "NOTE", note });

// What the booking page and the order window need to know, without any file bytes.
export async function uploadsForBooking(bookingId: string) {
  const rows = await db.select({ id: s.customerUploads.id, requestId: s.customerUploads.requestId, travelerId: s.customerUploads.travelerId, kind: s.customerUploads.kind, status: s.customerUploads.status,
    rejectReason: s.customerUploads.rejectReason, createdAt: s.customerUploads.createdAt, filename: s.customerUploads.filename, mime: s.customerUploads.mime, size: s.customerUploads.size,
    customerNote: s.customerUploads.customerNote, amount: s.customerUploads.amount, reviewedAt: s.customerUploads.reviewedAt })
    .from(s.customerUploads).where(eq(s.customerUploads.bookingId, bookingId));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.getTime(), reviewedAt: r.reviewedAt ? r.reviewedAt.getTime() : null }));
}
export type UploadInfo = Awaited<ReturnType<typeof uploadsForBooking>>[number];

// Each traveler of a booking and whether their passport is already in the Passport section.
export async function travelersWithPassport(bookingId: string): Promise<TravelerRow[]> {
  const [ts, files] = await Promise.all([
    db.select({ id: s.travelers.id, name: s.travelers.fullName }).from(s.travelers).where(eq(s.travelers.bookingId, bookingId)),
    db.select({ travelerId: s.travelerFiles.travelerId }).from(s.travelerFiles).where(and(eq(s.travelerFiles.bookingId, bookingId), eq(s.travelerFiles.kind, "PASSPORT"))),
  ]);
  const have = new Set(files.map((f) => f.travelerId));
  return ts.map((t) => ({ id: t.id, name: t.name, hasPassport: have.has(t.id) }));
}

type SaveInput = { bookingId: string; requestId: string; travelerId: string | null; file: { name: string; size: number; bytes: Buffer }; note: string; amount: number | null };
export async function saveCustomerUpload(i: SaveInput): Promise<{ ok: true; kind: UploadKind; label: string } | { ok: false; message: string }> {
  const [b] = await db.select({ status: s.bookings.status }).from(s.bookings).where(eq(s.bookings.id, i.bookingId));
  if (!b) return { ok: false, message: "We couldn't find this booking." };
  const [r] = await db.select().from(s.bookingRequests).where(and(eq(s.bookingRequests.id, i.requestId), eq(s.bookingRequests.bookingId, i.bookingId)));
  const kind = r ? uploadKindFor(r) : null;
  let travelerOk = true; let travelerName = "";
  if (kind === "PASSPORT") {
    if (r) await syncTravelers(i.bookingId);
    const ts = await travelersWithPassport(i.bookingId); const t = ts.find((x) => x.id === i.travelerId);
    travelerOk = !!t && !t.hasPassport; travelerName = t?.name ?? "";
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(s.customerUploads).where(and(eq(s.customerUploads.bookingId, i.bookingId), eq(s.customerUploads.status, "PENDING")));
  const mime = i.file.size ? sniffMime(i.file.bytes) : null;
  const problem = uploadProblem({ size: i.file.size, mime, requestOpen: r?.status === "OPEN", kind, travelerOk, pending: Number(n), cancelled: b.status === "CANCELLED" });
  if (problem || !kind || !mime) return { ok: false, message: problem || "That file couldn't be used." };
  let buf = i.file.bytes; let outMime = mime;
  if (IMAGE_MIME.includes(mime)) { // shrink phone photos and drop hidden location data, as staff uploads do
    try { const sharp = (await import("sharp")).default; buf = await sharp(buf).rotate().resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(); outMime = "image/jpeg"; } catch { /* keep the original */ }
  }
  const base = (i.file.name || "upload").replace(/[^\w.\- ()]+/g, "_").slice(0, 100);
  const filename = outMime === "image/jpeg" && !/\.jpe?g$/i.test(base) ? base.replace(/\.[^.]+$/, "") + ".jpg" : base;
  // A new upload for the same traveler (or the same receipt) replaces one still waiting, so staff never check an old copy.
  const same = kind === "PASSPORT" ? eq(s.customerUploads.travelerId, i.travelerId ?? "") : eq(s.customerUploads.requestId, i.requestId);
  await db.delete(s.customerUploads).where(and(eq(s.customerUploads.bookingId, i.bookingId), eq(s.customerUploads.kind, kind), eq(s.customerUploads.status, "PENDING"), same));
  await db.insert(s.customerUploads).values({ bookingId: i.bookingId, requestId: i.requestId, travelerId: kind === "PASSPORT" ? i.travelerId : null, kind, filename, mime: outMime, size: buf.length, data: encryptBuffer(buf),
    customerNote: i.note.slice(0, 300), amount: kind === "PAYMENT_PROOF" && i.amount != null && i.amount > 0 ? Math.round(i.amount * 100) / 100 : null });
  const label = kind === "PASSPORT" ? `passport for ${travelerName}` : UPLOAD_KIND_LABEL[kind].toLowerCase();
  await event(i.bookingId, `Customer uploaded ${label} (${filename}). Waiting for review.`);
  return { ok: true, kind, label };
}

// Closes requests whose need is met: passports when every traveler has one, the balance when nothing is left to pay.
export async function closeMetRequests(bookingId: string, by: string) {
  const reqs = await db.select().from(s.bookingRequests).where(and(eq(s.bookingRequests.bookingId, bookingId), eq(s.bookingRequests.status, "OPEN")));
  if (!reqs.length) return;
  const done: string[] = [];
  if (reqs.some((r) => r.kind === "PASSPORTS") && passportsComplete(await travelersWithPassport(bookingId))) done.push(...reqs.filter((r) => r.kind === "PASSPORTS").map((r) => r.id));
  if (reqs.some((r) => r.kind === "BALANCE")) {
    const [b] = await db.select({ total: s.bookings.total }).from(s.bookings).where(eq(s.bookings.id, bookingId));
    const [{ paid }] = await db.select({ paid: sql<number>`coalesce(sum(amount), 0)` }).from(s.payments).where(and(eq(s.payments.bookingId, bookingId), eq(s.payments.status, "PAID")));
    if (b && b.total > 0 && Number(paid) >= b.total - 0.005) done.push(...reqs.filter((r) => r.kind === "BALANCE").map((r) => r.id));
  }
  if (!done.length) return;
  await db.update(s.bookingRequests).set({ status: "DONE", doneAt: new Date() }).where(inArray(s.bookingRequests.id, done));
  await event(bookingId, `${by}: ${done.length === 1 ? "A request is" : `${done.length} requests are`} complete and no longer shown to the customer.`);
}

type Who = { uid: string; name: string };
async function pendingUpload(bookingId: string, uploadId: string) {
  const [u] = await db.select().from(s.customerUploads).where(and(eq(s.customerUploads.id, uploadId), eq(s.customerUploads.bookingId, bookingId)));
  return u && u.status === "PENDING" ? u : null;
}

// Confirm: a passport goes into the traveler's Passport section (the encrypted bytes move, they are not stored twice);
// a receipt records the payment for the amount staff confirm; a file closes its note.
export async function approveUpload(bookingId: string, uploadId: string, who: Who, opts: { amount?: unknown } = {}): Promise<{ ok: boolean; message: string }> {
  const u = await pendingUpload(bookingId, uploadId); if (!u) return { ok: false, message: "That file was already checked." };
  if (u.kind === "PASSPORT") {
    const ts = await travelersWithPassport(bookingId); const t = ts.find((x) => x.id === u.travelerId);
    if (!t) return { ok: false, message: "That traveler is no longer on the order. Reject the file instead." };
    const [f] = await db.insert(s.travelerFiles).values({ travelerId: t.id, bookingId, kind: "PASSPORT", filename: u.filename, mime: u.mime, size: u.size, data: Buffer.from(u.data), uploadedById: who.uid }).returning({ id: s.travelerFiles.id });
    await db.update(s.customerUploads).set({ status: "APPROVED", reviewedById: who.uid, reviewedAt: new Date(), travelerFileId: f.id, data: EMPTY }).where(eq(s.customerUploads.id, u.id));
    await event(bookingId, `${who.name}: Confirmed the passport for ${t.name} and saved it in the Passport section.`);
    await closeMetRequests(bookingId, who.name);
    return { ok: true, message: `Passport for ${t.name} confirmed and saved in Travelers.` };
  }
  if (u.kind === "PAYMENT_PROOF") {
    const [b] = await db.select({ total: s.bookings.total, currency: s.bookings.currency }).from(s.bookings).where(eq(s.bookings.id, bookingId));
    const [{ paid }] = await db.select({ paid: sql<number>`coalesce(sum(amount), 0)` }).from(s.payments).where(and(eq(s.payments.bookingId, bookingId), eq(s.payments.status, "PAID")));
    const balance = Math.max(0, Math.round(((b?.total ?? 0) - Number(paid)) * 100) / 100);
    const a = parseReceiptAmount(opts.amount, balance); if (!a.ok) return a;
    const { recordPayment } = await import("./documents");
    await recordPayment(bookingId, who.uid, { amount: a.amount, method: "Bank transfer", note: "Receipt uploaded by the customer" });
    await db.update(s.customerUploads).set({ status: "APPROVED", reviewedById: who.uid, reviewedAt: new Date(), amount: a.amount }).where(eq(s.customerUploads.id, u.id));
    const cur = b?.currency ?? "USD"; const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(a.amount);
    await event(bookingId, `${who.name}: Confirmed the customer's receipt and recorded ${fmt}.`);
    await closeMetRequests(bookingId, who.name);
    return { ok: true, message: `Receipt confirmed. ${fmt} recorded as paid.` };
  }
  await db.update(s.customerUploads).set({ status: "APPROVED", reviewedById: who.uid, reviewedAt: new Date() }).where(eq(s.customerUploads.id, u.id));
  if (u.requestId) await db.update(s.bookingRequests).set({ status: "DONE", doneAt: new Date() }).where(and(eq(s.bookingRequests.id, u.requestId), eq(s.bookingRequests.bookingId, bookingId)));
  await event(bookingId, `${who.name}: Confirmed the file the customer sent (${u.filename}).`);
  return { ok: true, message: "File confirmed. The request is complete." };
}

// Reject with a reason the customer reads on their booking page. The file itself is deleted at once.
export async function rejectUpload(bookingId: string, uploadId: string, who: Who, rawReason: unknown): Promise<{ ok: boolean; message: string }> {
  const r = parseRejectReason(rawReason); if (!r.ok) return r;
  const u = await pendingUpload(bookingId, uploadId); if (!u) return { ok: false, message: "That file was already checked." };
  await db.update(s.customerUploads).set({ status: "REJECTED", rejectReason: r.reason, reviewedById: who.uid, reviewedAt: new Date(), data: EMPTY }).where(eq(s.customerUploads.id, u.id));
  await event(bookingId, `${who.name}: Did not accept the ${UPLOAD_KIND_LABEL[u.kind as UploadKind]?.toLowerCase() ?? "file"} (${u.filename}): ${r.reason}`);
  return { ok: true, message: "Sent back. The customer sees your reason and can upload again." };
}

export type { UploadRow };
