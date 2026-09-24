"use server";
import { db, schema as s } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createItineraryDocument, emailDocument } from "@/lib/documents";
import { saveSettings, DEFAULTS } from "@/lib/settings";
import { getSettings } from "@/lib/settings";
import { blankItinerary, reid } from "@/lib/itinerary-templates";
import { createItineraryRecord, canLinkBooking, unlinkOthers } from "@/lib/itineraries";
import { calcSellPrice } from "@/lib/pricing";
import { cleanImageRef } from "@/lib/media";
import { invalidate } from "@/lib/cache";
import { parseJson, money } from "@/lib/format";
import type { ItineraryContent } from "@/pdf/types";

const go = (path: string, msg: string, err = false): never => redirect(`${path}${path.includes("?") ? "&" : "?"}${err ? "e" : "n"}=${encodeURIComponent(msg)}`);
const audit = (userId: string, action: string, entity: string, entityId?: string) => db.insert(s.auditLogs).values({ userId, action, entity, entityId });

// ---------- Settings and payment methods ----------
export async function saveCompanySettings(fd: FormData) {
  const u = await requireStaff("settings"); const values: Record<string, string> = {};
  for (const k of Object.keys(DEFAULTS)) if (fd.has(k)) values[k] = String(fd.get(k) ?? "").slice(0, 3000);
  const tab = ["company", "wording", "website", "referral"].includes(String(fd.get("tab"))) ? String(fd.get("tab")) : "company";
  await saveSettings(values); await audit(u.uid, "UPDATE", "settings"); revalidatePath("/admin/settings");
  return go(`/admin/settings?tab=${tab}`, "Settings saved. New PDFs use these details.");
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
  return { ...c, coverImageUrl: cleanImageRef(c.coverImageUrl), ctaUrl: safeUrl(c.ctaUrl), days: c.days.map((d) => ({ ...d, imageUrl: cleanImageRef(d.imageUrl), hotel: { ...d.hotel, link: safeUrl(d.hotel.link) }, blocks: d.blocks.map((b) => ({ ...b, link: safeUrl(b.link), imageUrl: cleanImageRef(b.imageUrl) })) })) };
}

export async function createItinerary(fd: FormData) {
  const u = await requireStaff("itineraries");
  const kind = String(fd.get("kind") ?? ""); // customer | tour | template | pdf — decides the starting point, chosen on the "New itinerary" picker
  const bookingId = String(fd.get("bookingId") ?? "");
  if (kind === "customer" && !bookingId) return go("/admin/itineraries/new", "Choose an order first", true);
  if (kind === "customer") { const check = await canLinkBooking(bookingId); if (!check.ok) return go("/admin/itineraries/new", check.message, true); }
  const intent = kind === "customer" || kind === "tour" ? kind : "pdf";
  const it = await createItineraryRecord({ templateId: String(fd.get("templateId") ?? ""), bookingId, name: String(fd.get("name") ?? ""), userId: u.uid, isTemplate: kind === "template", intent });
  if (bookingId) await unlinkOthers(bookingId, it.id); // this itinerary replaces whichever one was linked before, never sits alongside it
  await audit(u.uid, "CREATE", "itinerary", it.id);
  return redirect(`/admin/itineraries/${it.id}${kind ? `?flow=${kind}` : ""}`);
}
export async function saveItinerary(id: string, payload: string) {
  const u = await requireStaff("itineraries");
  let raw: unknown; try { raw = JSON.parse(payload); } catch { return { ok: false, message: "Could not read the itinerary data" }; }
  const p = z.object({
    name: z.string().trim().min(1).max(120), description: str(300), bookingId: z.string().max(60).nullable().optional(), content: contentSchema,
    costPrice: z.coerce.number().min(0).max(10_000_000).nullable().optional(), marginPercent: z.coerce.number().min(0).max(500).nullable().optional(),
    force: z.boolean().optional(),
  }).safeParse(raw);
  if (!p.success) return { ok: false, message: p.error.issues.slice(0, 2).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const costPrice = p.data.costPrice ?? null; const marginPercent = p.data.marginPercent ?? null;
  const priced = costPrice != null && marginPercent != null;
  // A Viator booking already has a settled price paid through Viator — the itinerary is just the trip plan for it, never the pricing mechanism.
  const isViatorBooking = p.data.bookingId ? !!(await db.select({ id: s.bookings.id }).from(s.bookings).where(and(eq(s.bookings.id, p.data.bookingId), eq(s.bookings.source, "VIATOR"))))[0] : false;
  // A price is required for any itinerary attached to a real order — there is no manual price line to fall back on.
  if (p.data.bookingId && !priced && !isViatorBooking) return { ok: false, message: "Enter the cost and the profit margin to price this order — there is no manual price." };
  const content = clean(p.data.content);
  let bookingNote = "";
  // Cost and margin are always per person. unitPrice is what one traveler pays; total is unitPrice × the travelers on the linked order.
  let unitPrice: number | null = null; let total: number | null = null; let travelers = 1; let currency = "USD"; let bookingStatus: string | null = null; let paidSoFar = 0;

  if (priced && p.data.bookingId && !isViatorBooking) {
    const [b] = await db.select({ currency: s.bookings.currency, status: s.bookings.status, adults: s.bookings.adults, children: s.bookings.children }).from(s.bookings).where(eq(s.bookings.id, p.data.bookingId));
    if (b) { currency = b.currency; bookingStatus = b.status; travelers = Math.max(1, b.adults + b.children); }
    const [row] = await db.select({ paid: sql<number>`coalesce(sum(amount), 0)` }).from(s.payments).where(and(eq(s.payments.bookingId, p.data.bookingId), eq(s.payments.status, "PAID")));
    paidSoFar = row?.paid ?? 0;
  }
  if (priced) { unitPrice = calcSellPrice(costPrice!, marginPercent!); total = Math.round(unitPrice * travelers * 100) / 100; }

  // Repricing a cancelled or completed trip, or one that already has money paid on it, needs a clear "are you sure" — it is easy to do by
  // accident (editing an old itinerary as a starting point) and the change is otherwise silent.
  if (priced && p.data.bookingId && !p.data.force && !isViatorBooking) {
    const reasons: string[] = [];
    if (bookingStatus === "CANCELLED") reasons.push("this order is cancelled");
    if (bookingStatus === "COMPLETED") reasons.push("this trip is already marked completed");
    if (paidSoFar > 0) reasons.push(`${money(paidSoFar, currency)} has already been paid on it`);
    if (reasons.length) return { ok: false, needsConfirm: true, message: `This will change the price on an order where ${reasons.join(" and ")}. The total for ${travelers} traveler${travelers === 1 ? "" : "s"} will become ${money(total!, currency)}. Update it anyway?` };
  }

  if (priced) {
    content.priceLabel = p.data.bookingId
      ? `${money(unitPrice!, currency)} per person — ${money(total!, currency)} total for ${travelers} traveler${travelers === 1 ? "" : "s"}`
      : `${money(unitPrice!, currency)} per person`;
    if (p.data.bookingId && !isViatorBooking) {
      const [before] = await db.select({ total: s.bookings.total }).from(s.bookings).where(eq(s.bookings.id, p.data.bookingId));
      await db.update(s.bookings).set({ subtotal: total!, total: total!, costTotal: Math.round(costPrice! * travelers * 100) / 100 }).where(eq(s.bookings.id, p.data.bookingId));
      if (before && before.total !== total) await db.insert(s.bookingEvents).values({ bookingId: p.data.bookingId, type: "NOTE", note: `Price changed from ${money(before.total, currency)} to ${money(total!, currency)} via the itinerary (${money(costPrice!, currency)} per person cost, ${marginPercent}% margin, ${travelers} traveler${travelers === 1 ? "" : "s"}) by ${u.email ?? u.uid}.` });
      bookingNote = ` The linked order's total is now ${money(total!, currency)} (${money(unitPrice!, currency)} per person × ${travelers}).`;
    }
  }
  await db.update(s.itineraries).set({ name: p.data.name, description: p.data.description, bookingId: p.data.bookingId || null, content: JSON.stringify(content), costPrice, marginPercent, updatedAt: new Date() }).where(eq(s.itineraries.id, id));
  await audit(u.uid, "UPDATE", "itinerary", id); return { ok: true, message: bookingNote ? `Saved.${bookingNote}` : "Saved" };
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
  if (bookingId) { const check = await canLinkBooking(bookingId, id); if (!check.ok) return go(`/admin/itineraries/${id}`, check.message, true); }
  await db.update(s.itineraries).set({ bookingId: bookingId || null }).where(eq(s.itineraries.id, id));
  if (bookingId) await unlinkOthers(bookingId, id); // replaces whichever itinerary was linked before, so only one is ever attached at once
  await audit(u.uid, "ATTACH", "itinerary", id);
  return go(`/admin/itineraries/${id}`, bookingId ? "Attached to booking" : "Detached from booking");
}

// ---------- Publish an itinerary as a website tour ----------
const slugify = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "tour";
const publishSchema = z.object({ destinationId: z.string().min(1), price: z.coerce.number().min(0).max(1_000_000), pricingModel: z.enum(["PER_PERSON", "PER_GROUP"]), status: z.enum(["DRAFT", "PUBLISHED"]), slug: z.string().trim().max(90).optional().default("") });
export async function publishItineraryAsTour(id: string, fd: FormData) {
  const u = await requireStaff("tours"); const back = `/admin/itineraries/${id}`;
  const p = publishSchema.safeParse(Object.fromEntries(fd.entries())); if (!p.success) return go(back, p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "), true);
  const [it] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, id)); if (!it) return go("/admin/itineraries", "Not found", true);
  const c = parseJson<ItineraryContent>(it.content, blankItinerary()); const n = c.days.length || 1;
  const title = (c.title || it.name).slice(0, 160); if (title.length < 3) return go(back, "Give the itinerary a title first (Trip details)", true);
  const short = (c.subtitle || c.intro || title).slice(0, 300); const long = (c.intro || short).slice(0, 8000);
  const days = c.days.map((d, i) => ({ title: `Day ${i + 1}: ${d.title || d.location || "Your day"}`.slice(0, 160), text: [d.hook, ...d.blocks.filter((b) => b.title).map((b) => b.title + (b.description ? `: ${b.description}` : ""))].filter(Boolean).join(" ").slice(0, 900) }));
  const cancel = (await getSettings())["invoice.cancellation"].split("\n").map((x) => x.trim()).filter(Boolean).join(" ");
  const category = n > 1 ? (/cruise/i.test(title + " " + c.destinations.join(" ")) ? "NILE_CRUISE" : "MULTI_DAY") : "DAY";
  const base = { title, shortDescription: short, longDescription: long, destinationId: p.data.destinationId, category, durationDays: n, durationHours: n > 1 ? 24 : 8, price: p.data.price, pricingModel: p.data.pricingModel, isPrivateAvailable: true, isGroupAvailable: p.data.pricingModel === "PER_PERSON",
    highlights: JSON.stringify(c.highlights), itinerary: JSON.stringify(days), included: JSON.stringify(c.included), excluded: JSON.stringify(c.excluded),
    pickupInfo: "Pickup and transfers are arranged for each day of your trip. We confirm exact times after you book.", meetingPoint: "We meet you at your hotel or airport arrival. Details are sent on WhatsApp.", whatToBring: "Comfortable shoes, sun hat, sunscreen, water bottle, and your passport for hotel and ship check-in.",
    cancellationPolicy: cancel.slice(0, 900), imageUrl: cleanImageRef(c.coverImageUrl) || null, seoTitle: `${title} | Egypt Knight Tours`.slice(0, 70), seoDescription: `${short}. Book direct with Egypt Knight Tours.`.slice(0, 168), status: p.data.status, updatedAt: new Date() };
  let tourId = it.tourId; let existing = tourId ? (await db.select().from(s.tours).where(eq(s.tours.id, tourId)))[0] : undefined;
  if (existing) { await db.update(s.tours).set(base).where(eq(s.tours.id, existing.id)); }
  else {
    let slug = slugify(p.data.slug || title); for (let i = 2; (await db.select({ id: s.tours.id }).from(s.tours).where(eq(s.tours.slug, slug))).length; i++) slug = `${slugify(p.data.slug || title)}-${i}`;
    const [t] = await db.insert(s.tours).values({ ...base, slug, audience: "ALL", activityLevel: "EASY", maxTravelers: 12, faqs: "[]" }).returning(); tourId = t.id;
  }
  await db.update(s.itineraries).set({ tourId }).where(eq(s.itineraries.id, id));
  await audit(u.uid, existing ? "UPDATE" : "CREATE", "tour_from_itinerary", tourId!); revalidatePath("/tours"); revalidatePath("/"); invalidate("tours");
  return go(back, existing ? `Tour updated from this itinerary (${p.data.status === "PUBLISHED" ? "live on the website" : "saved as draft"}).` : p.data.status === "PUBLISHED" ? "Tour created and live on the website." : "Tour created as a draft. Publish it when you're ready.");
}

// ---------- Referral codes ----------
export async function toggleReferralCode(id: string, active: boolean) {
  const u = await requireStaff("referrals");
  await db.update(s.coupons).set({ active }).where(and(eq(s.coupons.id, id), eq(s.coupons.kind, "REFERRAL")));
  await audit(u.uid, active ? "ACTIVATE" : "DEACTIVATE", "referral_code", id); revalidatePath("/admin/referrals");
  return go("/admin/referrals", active ? "Code re-activated" : "Code deactivated");
}
