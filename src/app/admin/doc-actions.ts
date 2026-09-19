"use server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createInvoiceDocument, createItineraryDocument, emailDocument, markDocumentSent, recordPayment, setBookingStatus } from "@/lib/documents";
import { saveSettings, DEFAULTS } from "@/lib/settings";
import { BOOKING_STATUS } from "@/lib/validation";
import { blankItinerary, uid } from "@/lib/itinerary-templates";
import { parseJson } from "@/lib/format";
import type { ItineraryContent } from "@/pdf/types";

const go = (path: string, msg: string, err = false): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${err ? "e" : "n"}=${encodeURIComponent(msg)}`);
const audit = (userId: string, action: string, entity: string, entityId?: string) => db.insert(s.auditLogs).values({ userId, action, entity, entityId });
const num = (v: FormDataEntryValue | null) => { const n = Number(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : NaN; };

// ---------- Invoices, email, payments ----------
export async function generateInvoice(bookingId: string, fd: FormData) {
  const u = await requireStaff("documents"); const back = `/admin/bookings/${bookingId}`;
  const extras = String(fd.get("extras") ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [label, amt] = l.split("|"); return { label: (label ?? "").trim(), amount: Number((amt ?? "").replace(/[^0-9.\-]/g, "")) }; }).filter((e) => e.label && Number.isFinite(e.amount));
  const dueNow = num(fd.get("dueNow")); const deadline = String(fd.get("deadline") ?? "");
  const status = String(fd.get("status") ?? "AUTO");
  if (status !== "AUTO" && status !== "KEEP" && !(BOOKING_STATUS as readonly string[]).includes(status)) return go(back, "Invalid status", true);
  const doc = await createInvoiceDocument(bookingId, u.uid, { currency: String(fd.get("currency") ?? "").trim() || undefined, dueNow: Number.isFinite(dueNow) && String(fd.get("dueNow")).trim() !== "" ? dueNow : undefined, deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : undefined, extras, notes: String(fd.get("notes") ?? "").slice(0, 600), status });
  await audit(u.uid, "CREATE", "invoice", doc.id); revalidatePath(back);
  if (fd.get("sendNow") === "on") { const r = await emailDocument(doc.id, u.uid); return go(back, r.ok ? `Invoice ${doc.number} created and emailed. ${r.message}` : `Invoice ${doc.number} created. Email not sent: ${r.message}`, !r.ok); }
  return go(back, `Invoice ${doc.number} created`);
}
export async function emailDoc(bookingId: string, docId: string, fd: FormData) {
  const u = await requireStaff("documents"); const to = String(fd.get("to") ?? "").trim();
  if (to && !z.string().email().safeParse(to).success) return go(`/admin/bookings/${bookingId}`, "That email address isn't valid", true);
  const r = await emailDocument(docId, u.uid, to || undefined); await audit(u.uid, "EMAIL", "document", docId); revalidatePath(`/admin/bookings/${bookingId}`);
  return go(`/admin/bookings/${bookingId}`, r.message, !r.ok);
}
export async function markSent(bookingId: string, docId: string, via: string) {
  const u = await requireStaff("documents"); await markDocumentSent(docId, u.uid, via === "WHATSAPP" ? "WHATSAPP" : "MANUAL"); revalidatePath(`/admin/bookings/${bookingId}`);
  return go(`/admin/bookings/${bookingId}`, "Marked as sent to the customer");
}
export async function addPayment(bookingId: string, fd: FormData) {
  const u = await requireStaff("bookings"); const back = `/admin/bookings/${bookingId}`;
  const amount = num(fd.get("amount"));
  if (!(amount > 0) || amount > 1_000_000) return go(back, "Enter a payment amount above zero", true);
  const r = await recordPayment(bookingId, u.uid, { amount, method: String(fd.get("method") ?? "").slice(0, 60), note: String(fd.get("note") ?? "").slice(0, 200) });
  await audit(u.uid, "PAYMENT", "booking", bookingId); revalidatePath(back);
  return go(back, r.next === "PAID" ? "Payment recorded. Booking is now fully paid." : "Partial payment recorded.");
}
export async function changeStatus(bookingId: string, fd: FormData) {
  const u = await requireStaff("bookings"); const st = String(fd.get("status"));
  if (!(BOOKING_STATUS as readonly string[]).includes(st)) return go(`/admin/bookings/${bookingId}`, "Invalid status", true);
  await setBookingStatus(bookingId, st); await audit(u.uid, "STATUS", "booking", bookingId); revalidatePath(`/admin/bookings/${bookingId}`);
  return go(`/admin/bookings/${bookingId}`, "Status updated");
}

// ---------- Settings and payment methods ----------
export async function saveCompanySettings(fd: FormData) {
  const u = await requireStaff("settings"); const values: Record<string, string> = {};
  for (const k of Object.keys(DEFAULTS)) if (fd.has(k)) values[k] = String(fd.get(k) ?? "").slice(0, 3000);
  await saveSettings(values); await audit(u.uid, "UPDATE", "settings"); revalidatePath("/admin/settings");
  return go("/admin/settings", "Settings saved. New PDFs use these details.");
}
const methodSchema = z.object({ kind: z.enum(["BANK", "LINK", "WISE", "CARD", "OTHER"]), label: z.string().trim().min(2).max(80), currency: z.string().trim().max(6), sortOrder: z.coerce.number().int().min(0).max(999), bankName: z.string().trim().max(120), accountName: z.string().trim().max(120), accountNumber: z.string().trim().max(60), iban: z.string().trim().max(60), swift: z.string().trim().max(30), branch: z.string().trim().max(120), bankAddress: z.string().trim().max(240), instructions: z.string().trim().max(800), paymentUrl: z.string().trim().max(500).refine((v) => v === "" || /^https:\/\//i.test(v), "Payment link must start with https://") });
export async function savePaymentMethod(id: string | null, fd: FormData) {
  const u = await requireStaff("settings");
  const p = methodSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go("/admin/settings", p.error.issues.map((i) => i.message).join(", "), true);
  const row = { ...p.data, currency: p.data.currency.toUpperCase(), active: fd.get("active") === "on" };
  if (id) await db.update(s.paymentMethods).set(row).where(eq(s.paymentMethods.id, id)); else await db.insert(s.paymentMethods).values(row);
  await audit(u.uid, id ? "UPDATE" : "CREATE", "payment_method", id ?? undefined); revalidatePath("/admin/settings");
  return go("/admin/settings", "Payment method saved. New PDFs will use it.");
}
export async function deletePaymentMethod(id: string) {
  const u = await requireStaff("settings"); await db.delete(s.paymentMethods).where(eq(s.paymentMethods.id, id)); await audit(u.uid, "DELETE", "payment_method", id);
  revalidatePath("/admin/settings"); return go("/admin/settings", "Payment method removed");
}

// ---------- Itineraries ----------
const str = (max: number) => z.string().max(max).default("");
const blockSchema = z.object({ id: z.string().max(20), type: z.enum(["ACTIVITY", "TOUR", "TRANSPORT", "TRANSFER", "FLIGHT", "HOTEL", "MEAL", "FREE_TIME", "NOTE", "MEETING_POINT", "GUIDE", "INFO"]), time: str(40), title: str(160), description: str(1500), location: str(160), link: str(400), imageUrl: str(500), notes: str(600) });
const daySchema = z.object({ id: z.string().max(20), title: str(160), hook: str(300), location: str(120), date: str(10), imageUrl: str(500), hotel: z.object({ name: str(160), stars: str(30), notes: str(400), link: str(400) }), blocks: z.array(blockSchema).max(40), notes: str(800) });
const contentSchema = z.object({ title: str(160), subtitle: str(240), intro: str(1800), coverImageUrl: str(500), customerName: str(120), travelers: str(60), startDate: str(10), endDate: str(10), destinations: z.array(z.string().max(60)).max(12), highlights: z.array(z.string().max(160)).max(16), days: z.array(daySchema).max(45), included: z.array(z.string().max(240)).max(30), excluded: z.array(z.string().max(240)).max(30), important: z.array(z.string().max(400)).max(20), priceLabel: str(120), paymentTerms: str(400), ctaUrl: str(500), ctaLabel: str(60), sceneKind: str(20) });
const safeUrl = (u: string) => (u === "" || /^(https?:\/\/|mailto:)/i.test(u) ? u : "");
function clean(c: z.infer<typeof contentSchema>): ItineraryContent {
  return { ...c, coverImageUrl: safeUrl(c.coverImageUrl), ctaUrl: safeUrl(c.ctaUrl), days: c.days.map((d) => ({ ...d, imageUrl: safeUrl(d.imageUrl), hotel: { ...d.hotel, link: safeUrl(d.hotel.link) }, blocks: d.blocks.map((b) => ({ ...b, link: safeUrl(b.link), imageUrl: safeUrl(b.imageUrl) })) })) };
}
const reid = (c: ItineraryContent): ItineraryContent => ({ ...c, days: c.days.map((d) => ({ ...d, id: uid(), blocks: d.blocks.map((b) => ({ ...b, id: uid() })) })) });

export async function createItinerary(fd: FormData) {
  const u = await requireStaff("itineraries");
  const templateId = String(fd.get("templateId") ?? ""); const bookingId = String(fd.get("bookingId") ?? "");
  let content: ItineraryContent = blankItinerary(); let name = String(fd.get("name") ?? "").trim() || "New itinerary"; let sourceTemplateId: string | null = null;
  if (templateId) { const [t] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, templateId)); if (t) { content = reid(parseJson<ItineraryContent>(t.content, content)); sourceTemplateId = t.id; if (!fd.get("name")) name = t.name; } }
  if (bookingId) {
    const [r] = await db.select({ b: s.bookings, c: s.customers }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.bookings.id, bookingId));
    if (r) { const n = content.days.length || 1; const end = new Date(r.b.travelDate + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() + n - 1);
      content = { ...content, customerName: r.c.name, travelers: `${r.b.adults + r.b.children + r.b.infants} traveler${r.b.adults + r.b.children + r.b.infants > 1 ? "s" : ""}`, startDate: r.b.travelDate, endDate: end.toISOString().slice(0, 10), days: content.days.map((d, i) => { const dt = new Date(r.b.travelDate + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + i); return { ...d, date: dt.toISOString().slice(0, 10) }; }) }; }
  }
  const [it] = await db.insert(s.itineraries).values({ name, content: JSON.stringify(content), bookingId: bookingId || null, sourceTemplateId, createdById: u.uid }).returning();
  await audit(u.uid, "CREATE", "itinerary", it.id); return redirect(`/admin/itineraries/${it.id}`);
}
export async function saveItinerary(id: string, payload: string) {
  const u = await requireStaff("itineraries");
  let raw: unknown; try { raw = JSON.parse(payload); } catch { return { ok: false, message: "Could not read the itinerary data" }; }
  const p = z.object({ name: z.string().trim().min(1).max(120), description: str(300), bookingId: z.string().max(60).nullable().optional(), content: contentSchema }).safeParse(raw);
  if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  await db.update(s.itineraries).set({ name: p.data.name, description: p.data.description, bookingId: p.data.bookingId || null, content: JSON.stringify(clean(p.data.content)), updatedAt: new Date() }).where(eq(s.itineraries.id, id));
  await audit(u.uid, "UPDATE", "itinerary", id); return { ok: true, message: "Saved" };
}
export async function duplicateItinerary(id: string) {
  const u = await requireStaff("itineraries"); const [t] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, id)); if (!t) return go("/admin/itineraries", "Not found", true);
  const [n] = await db.insert(s.itineraries).values({ name: `${t.name} (copy)`, description: t.description, isTemplate: t.isTemplate, content: JSON.stringify(reid(parseJson<ItineraryContent>(t.content, blankItinerary()))), createdById: u.uid, sourceTemplateId: t.sourceTemplateId }).returning();
  return redirect(`/admin/itineraries/${n.id}?n=${encodeURIComponent("Duplicated")}`);
}
export async function saveAsTemplate(id: string, fd: FormData) {
  const u = await requireStaff("itineraries"); const [t] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, id)); if (!t) return go("/admin/itineraries", "Not found", true);
  const name = String(fd.get("templateName") ?? "").trim() || t.name; const c = reid(parseJson<ItineraryContent>(t.content, blankItinerary()));
  const [n] = await db.insert(s.itineraries).values({ name, description: t.description, isTemplate: true, content: JSON.stringify({ ...c, customerName: "", travelers: "", startDate: "", endDate: "", days: c.days.map((d) => ({ ...d, date: "" })) }), createdById: u.uid }).returning();
  await audit(u.uid, "CREATE", "template", n.id); return go(`/admin/itineraries?tab=templates`, `Saved as template "${name}"`);
}
export async function deleteItinerary(id: string) {
  const u = await requireStaff("itineraries"); const docs = await db.select({ id: s.documents.id }).from(s.documents).where(eq(s.documents.itineraryId, id)).limit(1);
  if (docs.length) return go(`/admin/itineraries/${id}`, "This itinerary has generated PDFs in a booking's history, so it can't be deleted.", true);
  await db.delete(s.itineraries).where(eq(s.itineraries.id, id)); await audit(u.uid, "DELETE", "itinerary", id); return go("/admin/itineraries", "Deleted");
}
export async function generateItineraryPdf(id: string, fd?: FormData) {
  const u = await requireStaff("itineraries"); const doc = await createItineraryDocument(id, u.uid); await audit(u.uid, "CREATE", "itinerary_pdf", doc.id);
  const to = doc.bookingId ? `/admin/bookings/${doc.bookingId}` : `/admin/itineraries/${id}`;
  if (fd?.get("sendNow") === "on") { const r = await emailDocument(doc.id, u.uid); return go(to, r.ok ? `PDF generated and emailed. ${r.message}` : `PDF generated. Email not sent: ${r.message}`, !r.ok); }
  return go(to, `PDF ${doc.number} generated`);
}
export async function attachItinerary(id: string, fd: FormData) {
  const u = await requireStaff("itineraries"); const bookingId = String(fd.get("bookingId") ?? "");
  await db.update(s.itineraries).set({ bookingId: bookingId || null }).where(eq(s.itineraries.id, id)); await audit(u.uid, "ATTACH", "itinerary", id);
  return go(`/admin/itineraries/${id}`, bookingId ? "Attached to booking" : "Detached from booking");
}
