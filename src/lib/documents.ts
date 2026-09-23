import { db, schema as s } from "@/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { buildInvoiceData, type InvoiceOptions } from "./invoice";
import { BUILDER_NAME } from "./builder";
import { getSettings, companyFrom } from "./settings";
import { signDoc, signRef } from "./booking-token";
import { sendEmail, brandedEmail } from "./email";
import { SITE, parseJson } from "./format";
import { linkOrigin } from "./origin";
import { signReview } from "./booking-token";
import { creditReferralRewardIfDue } from "./referrals";
import { renderInvoice, renderItinerary } from "@/pdf/render";
import { prepareImages } from "@/pdf/images";
import type { InvoiceData, ItineraryContent, ItineraryPdfData } from "@/pdf/types";

const AUTO_FROM = ["INQUIRY", "QUOTE_SENT", "PENDING", "CONFIRMED"];
export const docUrl = (id: string, origin: string = SITE) => `${origin}/api/documents/${id}/pdf?t=${signDoc(id)}`;

export async function setBookingStatus(bookingId: string, status: string) {
  await db.update(s.bookings).set({ status }).where(eq(s.bookings.id, bookingId));
  await db.insert(s.bookingEvents).values({ bookingId, type: "STATUS_" + status });
  // A trip marked completed for the first time starts the post-trip review flow: an invite email, and a page waiting for them when they click it.
  if (status === "COMPLETED") {
    const [existing] = await db.select({ id: s.postTripReviews.id }).from(s.postTripReviews).where(eq(s.postTripReviews.bookingId, bookingId));
    if (!existing) {
      const [row] = await db.select({ b: s.bookings, c: s.customers }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.bookings.id, bookingId));
      if (row) {
        await db.insert(s.postTripReviews).values({ bookingId, customerId: row.c.id });
        const g = await getSettings(); const origin = await linkOrigin();
        const url = `${origin}/review/${row.b.ref}?t=${signReview(row.b.ref)}`;
        const em = brandedEmail({
          greeting: `Hi ${row.c.name.split(" ")[0]}, welcome home!`,
          lines: [`We hope you had an unforgettable trip with ${companyFrom(g).name}. It would mean a lot if you shared a quick review of your experience.`, "As a thank-you, sharing your review unlocks a personal discount code you can give to friends and family — and you earn a reward every time someone books with it."],
          buttonLabel: "Share your experience", buttonUrl: url, footer: `${companyFrom(g).name}. Thank you for traveling with us.`, builder: BUILDER_NAME,
        });
        await sendEmail({ to: row.c.email, subject: "How was your trip? Share a review and unlock a reward", html: em.html, text: em.text });
      }
    }
  }
}

export async function createInvoiceDocument(bookingId: string, userId: string, opts: InvoiceOptions & { status?: string } = {}) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(s.documents).where(and(eq(s.documents.bookingId, bookingId), eq(s.documents.kind, "INVOICE")));
  const version = Number(n) + 1;
  const data = await buildInvoiceData(bookingId, opts, version);
  if (!data) throw new Error("Booking not found");
  const [doc] = await db.insert(s.documents).values({ kind: "INVOICE", number: data.number, version, bookingId, currency: data.currency, amount: data.dueNow, data: JSON.stringify(data), createdById: userId }).returning();
  await db.insert(s.documentEvents).values({ documentId: doc.id, type: "CREATED", userId });
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId));
  const explicit = opts.status && opts.status !== "AUTO" && opts.status !== "KEEP";
  if (explicit) await setBookingStatus(bookingId, opts.status!);
  else if (opts.status !== "KEEP" && AUTO_FROM.includes(b.status)) await setBookingStatus(bookingId, "INVOICED");
  return doc;
}

export async function renderDocument(doc: typeof s.documents.$inferSelect): Promise<Buffer> {
  if (doc.kind === "INVOICE") return renderInvoice(parseJson<InvoiceData>(doc.data, null as never));
  const d = parseJson<ItineraryPdfData>(doc.data, null as never);
  const c = d.content;
  const urls = [c.coverImageUrl, ...c.days.flatMap((x) => [x.imageUrl, ...x.blocks.map((b) => b.imageUrl)])].filter(Boolean);
  return renderItinerary({ ...d, images: await prepareImages(urls) });
}

export async function createItineraryDocument(itineraryId: string, userId: string) {
  const [it] = await db.select().from(s.itineraries).where(eq(s.itineraries.id, itineraryId));
  if (!it) throw new Error("Itinerary not found");
  const g = await getSettings();
  const content = parseJson<ItineraryContent>(it.content, null as never);
  let ref = `IT-${it.id.slice(0, 6).toUpperCase()}`; let ctaUrl = content.ctaUrl || "";
  if (it.bookingId) {
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, it.bookingId));
    if (b) { ref = b.ref; if (!ctaUrl) ctaUrl = `${await linkOrigin()}/track/${b.ref}?t=${signRef(b.ref)}`; }
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(s.documents).where(eq(s.documents.itineraryId, itineraryId));
  const version = Number(n) + 1;
  const data: ItineraryPdfData = { content, ref, company: companyFrom(g), ctaUrl, generatedAt: new Date().toISOString(), images: {} };
  const [doc] = await db.insert(s.documents).values({ kind: "ITINERARY", number: `${ref}-ITIN-${version}`, version, bookingId: it.bookingId, itineraryId, data: JSON.stringify(data), createdById: userId }).returning();
  await db.insert(s.documentEvents).values({ documentId: doc.id, type: "CREATED", userId });
  await db.update(s.itineraries).set({ status: it.status === "SENT" ? "SENT" : "READY" }).where(eq(s.itineraries.id, itineraryId));
  return doc;
}

export async function emailDocument(docId: string, userId: string, toOverride?: string) {
  const [doc] = await db.select().from(s.documents).where(eq(s.documents.id, docId));
  if (!doc) return { ok: false as const, message: "Document not found" };
  let to = toOverride ?? "", name = "there";
  if (doc.bookingId) {
    const [c] = await db.select({ c: s.customers }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).where(eq(s.bookings.id, doc.bookingId));
    if (c) { to ||= c.c.email; name = c.c.name.split(" ")[0]; }
  }
  if (!to) return { ok: false as const, message: "No customer email on this booking. Enter one first." };
  const g = await getSettings(); const company = g["company.name"]; const builder = BUILDER_NAME;
  const inv = doc.kind === "INVOICE";
  const link = docUrl(doc.id, await linkOrigin());
  const mail = brandedEmail(inv
    ? { greeting: `Hi ${name}, your Egypt adventure is almost confirmed.`, lines: [`Your invoice ${doc.number} is attached. It shows exactly what's due and how to pay.`, doc.amount != null ? `Amount due now: ${new Intl.NumberFormat("en-US", { style: "currency", currency: doc.currency }).format(doc.amount)}.` : "", "Once you've paid, send us a quick message with your receipt and we'll confirm right away."].filter(Boolean), buttonLabel: "Open your invoice", buttonUrl: link, footer: `${company}. Questions? Just reply to this email.`, builder }
    : { greeting: `Hi ${name}, here's your Egypt itinerary.`, lines: ["We've put your trip together day by day. Have a look, and tell us what you'd like to change.", "When you're ready to make it official, the last page has everything you need."], buttonLabel: "Open your itinerary", buttonUrl: link, footer: `${company}. Questions? Just reply to this email.`, builder });
  const pdf = await renderDocument(doc);
  const res = await sendEmail({ to, subject: inv ? `Your ${company} invoice ${doc.number}` : `Your Egypt itinerary from ${company}`, html: mail.html, text: mail.text, attachments: [{ filename: `${doc.number}.pdf`, content: pdf }], replyTo: g["company.email"] });
  if (!res.ok) { await db.insert(s.documentEvents).values({ documentId: doc.id, type: "EMAIL_FAILED", note: res.message, userId }); return { ok: false as const, message: res.message }; }
  await db.update(s.documents).set({ status: "SENT", sentAt: new Date(), sentTo: to, sentVia: "EMAIL" }).where(eq(s.documents.id, doc.id));
  await db.insert(s.documentEvents).values({ documentId: doc.id, type: "EMAILED", note: to, userId });
  if (doc.itineraryId) await db.update(s.itineraries).set({ status: "SENT" }).where(eq(s.itineraries.id, doc.itineraryId));
  return { ok: true as const, message: `Sent to ${to}` };
}

export async function markDocumentSent(docId: string, userId: string, via: string) {
  await db.update(s.documents).set({ status: "SENT", sentAt: new Date(), sentVia: via }).where(eq(s.documents.id, docId));
  await db.insert(s.documentEvents).values({ documentId: docId, type: "MARKED_SENT", note: via, userId });
  const [d] = await db.select().from(s.documents).where(eq(s.documents.id, docId));
  if (d?.itineraryId) await db.update(s.itineraries).set({ status: "SENT" }).where(eq(s.itineraries.id, d.itineraryId));
}

export async function recordPayment(bookingId: string, userId: string, o: { amount: number; method: string; note?: string }) {
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId));
  if (!b) throw new Error("Booking not found");
  await db.update(s.payments).set({ status: "SUPERSEDED" }).where(and(eq(s.payments.bookingId, bookingId), eq(s.payments.status, "PENDING")));
  await db.insert(s.payments).values({ bookingId, provider: o.method || "MANUAL", kind: "PAYMENT", amount: Math.round(o.amount * 100) / 100, status: "PAID", providerRef: o.note || null });
  const rows = await db.select().from(s.payments).where(and(eq(s.payments.bookingId, bookingId), eq(s.payments.status, "PAID")));
  const paid = rows.reduce((a, p) => a + p.amount, 0);
  const next = paid >= b.total - 0.005 ? "PAID" : "PARTIALLY_PAID";
  if (!["COMPLETED", "CANCELLED"].includes(b.status) && b.status !== next) await setBookingStatus(bookingId, next);
  if (rows.length === 1) await creditReferralRewardIfDue(bookingId); // this booking's first ever payment: if it used a referral code, pay out the reward now
  return { paid, next };
}

export async function bookingDocuments(bookingId: string) {
  return db.select().from(s.documents).where(eq(s.documents.bookingId, bookingId)).orderBy(desc(s.documents.createdAt));
}
