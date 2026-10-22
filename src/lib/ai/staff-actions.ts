// ---------- Running what the staff assistant proposed, only after the staff member confirms ----------
// The browser sends only the action's id. Here it must belong to this person, still be waiting, be less than 30 minutes
// old, and pass every check again (role, order, data) at the moment it runs. It is claimed first, so a double click runs
// it once. Every action is written to the order's history and the audit log as "AI assistant, confirmed by <name>".
import { db, schema as s } from "@/db";
import { and, eq } from "drizzle-orm";
import { PERMS, type Session } from "../auth";
import { parseJson } from "../format";
import { loadOrder } from "../orders";
import { setBookingStatus } from "../documents";
import { applyBooking, canLinkBooking } from "../itineraries";
import { parseRequest } from "../customer-requests";
import { syncTravelers } from "../travelers";
import { sendEmail, brandedEmail } from "../email";
import { getSettings } from "../settings";
import { BUILDER_NAME } from "../builder";
import { BOOKING_STATUS } from "../validation";
import { uid } from "../itinerary-templates";
import { checkDraft, draftToContent } from "./rules";
import { knownData } from "./customer";

const MAX_AGE = 30 * 60_000;
const by = (u: Session) => `AI assistant, confirmed by ${u.name || u.email}`;
const audit = (u: Session, action: string, entityId: string) => db.insert(s.auditLogs).values({ userId: u.uid, action, entity: "ai_action", entityId });
async function bookingByRef(ref: unknown) { const [b] = await db.select({ id: s.bookings.id, ref: s.bookings.ref }).from(s.bookings).where(eq(s.bookings.ref, String(ref ?? ""))); if (!b) throw new Error("That order no longer exists."); return b; }

export async function cancelAction(u: Session, id: string) {
  await db.update(s.aiActions).set({ status: "CANCELLED", decidedAt: new Date() }).where(and(eq(s.aiActions.id, id), eq(s.aiActions.userId, u.uid), eq(s.aiActions.status, "PENDING")));
  return { ok: true, message: "Cancelled. Nothing was changed." };
}

export async function confirmAction(u: Session, id: string): Promise<{ ok: boolean; message: string }> {
  if (!PERMS.bookings.includes(u.role)) return { ok: false, message: "Your role can't run assistant actions." };
  const [a] = await db.select().from(s.aiActions).where(and(eq(s.aiActions.id, String(id)), eq(s.aiActions.userId, u.uid)));
  if (!a || a.status !== "PENDING") return { ok: false, message: "This action was already handled." };
  if (Date.now() - a.createdAt.getTime() > MAX_AGE) { await db.update(s.aiActions).set({ status: "CANCELLED", result: "Expired" }).where(eq(s.aiActions.id, a.id)); return { ok: false, message: "This suggestion is more than 30 minutes old. Ask the assistant again." }; }
  const claimed = await db.update(s.aiActions).set({ status: "RUNNING", decidedAt: new Date() }).where(and(eq(s.aiActions.id, a.id), eq(s.aiActions.status, "PENDING"))).returning({ id: s.aiActions.id });
  if (!claimed.length) return { ok: false, message: "This action was already handled." };
  try {
    const message = await run(u, a.kind, parseJson<Record<string, unknown>>(a.payload, {}));
    await db.update(s.aiActions).set({ status: "DONE", result: message }).where(eq(s.aiActions.id, a.id));
    await audit(u, `AI_${a.kind}`, a.id);
    return { ok: true, message };
  } catch (e) {
    const message = e instanceof Error ? e.message : "That didn't work.";
    await db.update(s.aiActions).set({ status: "FAILED", result: message }).where(eq(s.aiActions.id, a.id));
    return { ok: false, message };
  }
}

async function run(u: Session, kind: string, p: Record<string, unknown>): Promise<string> {
  if (kind === "SEND_EMAIL") {
    const b = await bookingByRef(p.ref); const o = await loadOrder(b.id); if (!o) throw new Error("That order no longer exists.");
    if (!o.customer.email) throw new Error("This customer has no email on file. Send it on WhatsApp instead.");
    const subject = String(p.subject ?? "").slice(0, 150); const body = String(p.body ?? "").slice(0, 4000); if (!subject || !body) throw new Error("The email is empty.");
    const g = await getSettings();
    const mail = brandedEmail({ greeting: `Hi ${o.customer.name.split(" ")[0]},`, lines: body.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean), buttonLabel: "Open your booking", buttonUrl: o.trackUrl, footer: `${o.companyName}. Questions? Just reply to this email.`, builder: BUILDER_NAME });
    const r = await sendEmail({ to: o.customer.email, subject, html: mail.html, text: mail.text, replyTo: g["company.email"] });
    if (!r.ok) throw new Error(`The email wasn't sent: ${r.message}`);
    await db.insert(s.bookingEvents).values({ bookingId: b.id, type: "NOTE", note: `${by(u)}: Emailed the customer "${subject}"` });
    return `Email sent to the customer of ${b.ref}.`;
  }
  if (kind === "CREATE_ITINERARY") {
    if (!PERMS.itineraries.includes(u.role)) throw new Error("Your role can't create itineraries.");
    const { known } = await knownData(); const r = checkDraft(p.draft, known); if (!r.ok) throw new Error(r.message);
    let content = draftToContent(r.draft, known, uid); let bookingId: string | null = null; let label = "";
    if (p.ref) { const b = await bookingByRef(p.ref); const ok = await canLinkBooking(b.id); if (!ok.ok) throw new Error(ok.message); const a = await applyBooking(content, b.id); content = a.content; bookingId = b.id; label = a.label; }
    const [it] = await db.insert(s.itineraries).values({ name: label || r.draft.title, content: JSON.stringify(content), bookingId, intent: bookingId ? "customer" : "pdf", createdById: u.uid }).returning({ id: s.itineraries.id });
    if (bookingId) await db.insert(s.bookingEvents).values({ bookingId, type: "NOTE", note: `${by(u)}: Created itinerary "${r.draft.title}" (no price yet)` });
    return `Itinerary created. Open it in Itineraries to check it and set the price. [open:/admin/itineraries/${it.id}]`;
  }
  if (kind === "ADD_REQUEST") {
    const b = await bookingByRef(p.ref); const r = parseRequest({ kind: p.kind, text: p.text, important: p.important, dueDate: p.dueDate, needsUpload: p.needsUpload }); if (!r.ok) throw new Error(r.message);
    await db.insert(s.bookingRequests).values({ bookingId: b.id, ...r.value, createdById: u.uid });
    if (r.value.kind === "PASSPORTS") await syncTravelers(b.id);
    await db.insert(s.bookingEvents).values({ bookingId: b.id, type: "NOTE", note: `${by(u)}: Asked the customer for ${r.value.kind.toLowerCase()}` });
    return `Added to ${b.ref}. The customer sees it on their booking page now.`;
  }
  if (kind === "ADD_NOTE") {
    const b = await bookingByRef(p.ref); const text = String(p.text ?? "").slice(0, 1000); if (!text) throw new Error("The note is empty.");
    await db.insert(s.bookingEvents).values({ bookingId: b.id, type: "NOTE", note: `${by(u)}: ${text}` });
    return `Note added to ${b.ref}.`;
  }
  if (kind === "SET_STATUS") {
    const b = await bookingByRef(p.ref); const st = String(p.status ?? ""); if (!(BOOKING_STATUS as readonly string[]).includes(st)) throw new Error("Not a valid status.");
    await setBookingStatus(b.id, st);
    await db.insert(s.bookingEvents).values({ bookingId: b.id, type: "NOTE", note: `${by(u)}: Changed the status` });
    return `${b.ref} status changed.`;
  }
  throw new Error("Unknown action.");
}
