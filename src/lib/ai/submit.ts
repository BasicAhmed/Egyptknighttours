// ---------- "Send to our team" from the AI planner ----------
// Step 1 (start): real name, real email, real WhatsApp number, travel date and travelers are checked; a 6-digit code is
// emailed. Step 2 (confirm): the right code creates the order (source AI planner, no price) with the plan attached as
// its itinerary, so staff price it the usual way. Rate limited per address and per email; only a hash of the code is kept.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { db, schema as s } from "@/db";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { rateLimitPersistent } from "../rate-limit";
import { findCustomer } from "../customers";
import { newBookingRef } from "../booking";
import { syncTravelers } from "../travelers";
import { ensureCustomTour } from "../custom-tour";
import { applyBooking } from "../itineraries";
import { signRef } from "../booking-token";
import { linkOrigin } from "../origin";
import { sendEmail, brandedEmail } from "../email";
import { getSettings, companyFrom } from "../settings";
import { BUILDER_NAME } from "../builder";
import { parseJson } from "../format";
import { uid } from "../itinerary-templates";
import { AiError } from "./claude";
import { checkEmail, checkPhone, checkName, draftToContent, LIMITS, type Draft } from "./rules";
import { knownData, ipHash } from "./customer";

const hashCode = (code: string, email: string) => createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:code:${email}:${code}`).digest("hex");
const ISO = /^\d{4}-\d{2}-\d{2}$/;
type Contact = { name: string; email: string; phone: string; travelDate: string; adults: number; children: number };

async function openConversation(id: string) {
  const [c] = await db.select().from(s.aiConversations).where(and(eq(s.aiConversations.id, String(id)), eq(s.aiConversations.scope, "CUSTOMER")));
  if (!c || !c.draft) throw new AiError("Build your plan first, then send it.", 400);
  if (c.bookingId) throw new AiError("This plan was already sent to our team.", 409);
  return c;
}

export async function startSubmit(input: Record<string, unknown>, ip: string) {
  if (String(input.website ?? "")) throw new AiError("Something went wrong. Please try again.", 400); // hidden field only bots fill in
  const conv = await openConversation(String(input.conversationId ?? ""));
  const n = checkName(input.name); if (!n.ok) throw new AiError(n.message, 400);
  const e = checkEmail(input.email); if (!e.ok) throw new AiError(e.message, 400);
  const p = checkPhone(input.whatsapp); if (!p.ok) throw new AiError(p.message, 400);
  const travelDate = String(input.travelDate ?? ""); const today = new Date().toISOString().slice(0, 10);
  if (!ISO.test(travelDate) || travelDate <= today || travelDate > new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10)) throw new AiError("Choose your first travel day (a future date).", 400);
  const adults = Math.floor(Number(input.adults)); const children = Math.floor(Number(input.children ?? 0));
  if (!(adults >= 1 && adults <= 50) || !(children >= 0 && children <= 50)) throw new AiError("Enter how many adults and children are travelling.", 400);
  const ipKey = ipHash(ip);
  if (!(await rateLimitPersistent(`ai-submit-ip:${ipKey}`, LIMITS.submitsPerIpPerDay, 86400_000))) throw new AiError("Too many requests from here today. Please message us on WhatsApp.", 429);
  if (!(await rateLimitPersistent(`ai-code:${e.email}`, LIMITS.codesPerEmailPerHour, 3600_000))) throw new AiError("We've already sent a few codes to this email. Please check your inbox (and spam), or wait an hour.", 429);
  const sentToday = await db.select({ n: sql<number>`count(*)` }).from(s.aiVerifications).where(and(eq(s.aiVerifications.email, e.email), gte(s.aiVerifications.createdAt, new Date(Date.now() - 86400_000))));
  if (Number(sentToday[0]?.n ?? 0) >= LIMITS.submitsPerEmailPerDay * 2) throw new AiError("This email has made several requests today. Our team will be in touch, or message us on WhatsApp.", 429);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const contact: Contact = { name: n.name, email: e.email, phone: p.phone, travelDate, adults, children };
  await db.insert(s.aiVerifications).values({ conversationId: conv.id, email: e.email, codeHash: hashCode(code, e.email), contact: JSON.stringify(contact), expiresAt: new Date(Date.now() + LIMITS.codeMinutes * 60_000) });
  const g = await getSettings(); const company = companyFrom(g).name;
  const mail = brandedEmail({ greeting: `Hi ${n.name.split(" ")[0]}, here is your code`, lines: [`Your code is ${code}.`, `Enter it on our website to send your trip plan to the ${company} team. It works for ${LIMITS.codeMinutes} minutes.`, "If you didn't ask for this, you can ignore this email."], buttonLabel: "Back to the website", buttonUrl: `${await linkOrigin()}/plan-my-trip`, footer: company, builder: BUILDER_NAME });
  const sent = await sendEmail({ to: e.email, subject: `${code} is your ${company} code`, html: mail.html, text: mail.text });
  if (!sent.ok) throw new AiError("We couldn't send the code right now. Please message us on WhatsApp instead.", 503);
  return { sentTo: e.email };
}

export async function confirmSubmit(input: Record<string, unknown>, ip: string) {
  const conv = await openConversation(String(input.conversationId ?? ""));
  const code = String(input.code ?? "").replace(/\D/g, "");
  if (code.length !== 6) throw new AiError("Enter the 6-digit code from the email.", 400);
  if (!(await rateLimitPersistent(`ai-confirm-ip:${ipHash(ip)}`, 30, 3600_000))) throw new AiError("Too many tries. Please wait a little.", 429);
  const [v] = await db.select().from(s.aiVerifications).where(and(eq(s.aiVerifications.conversationId, conv.id), isNull(s.aiVerifications.usedAt))).orderBy(desc(s.aiVerifications.createdAt)).limit(1);
  if (!v || v.expiresAt.getTime() < Date.now()) throw new AiError("That code has expired. Ask for a new one.", 400);
  if (v.attempts >= LIMITS.codeTries) throw new AiError("Too many wrong codes. Ask for a new one.", 400);
  const a = Buffer.from(hashCode(code, v.email)), b = Buffer.from(v.codeHash);
  if (!(a.length === b.length && timingSafeEqual(a, b))) { await db.update(s.aiVerifications).set({ attempts: v.attempts + 1 }).where(eq(s.aiVerifications.id, v.id)); throw new AiError("That code isn't right. Check the email and try again.", 400); }
  // One use only: claimed before anything is created, so a double click can't make two orders.
  const claimed = await db.update(s.aiVerifications).set({ usedAt: new Date() }).where(and(eq(s.aiVerifications.id, v.id), isNull(s.aiVerifications.usedAt))).returning({ id: s.aiVerifications.id });
  if (!claimed.length) throw new AiError("This plan was already sent to our team.", 409);
  const c = parseJson<Contact>(v.contact, null as never); const draft = parseJson<Draft>(conv.draft!, null as never);
  const { known } = await knownData();
  const tourId = await ensureCustomTour(); const ref = await newBookingRef();
  const bookingId = await db.transaction(async (tx) => {
    let cust = await findCustomer(tx, c.email, c.phone);
    if (cust && (!cust.whatsapp || !cust.email)) [cust] = await tx.update(s.customers).set({ email: cust.email || c.email, whatsapp: cust.whatsapp || c.phone, phone: cust.phone || c.phone }).where(eq(s.customers.id, cust.id)).returning();
    if (!cust) [cust] = await tx.insert(s.customers).values({ email: c.email, name: c.name, whatsapp: c.phone, phone: c.phone }).returning();
    const [bk] = await tx.insert(s.bookings).values({ ref, tourId, customerId: cust.id, guestName: c.name, travelDate: c.travelDate, adults: c.adults, children: c.children, infants: 0, isPrivate: true,
      specialRequests: draft.notes || null, subtotal: 0, discount: 0, total: 0, costTotal: null, deposit: 0, payMode: "DEPOSIT", currency: "USD", source: "AI", status: "PENDING", titleOverride: draft.title }).returning();
    await tx.insert(s.travelers).values({ bookingId: bk.id, fullName: c.name, type: "ADULT" });
    await tx.insert(s.bookingEvents).values({ bookingId: bk.id, type: "CREATED", note: "Sent from the AI trip planner (email confirmed by code)" });
    await tx.insert(s.leads).values({ name: c.name, email: c.email, whatsapp: c.phone, kind: "TRIP_BUILDER", status: "BOOKED", source: "ai-planner", travelDates: c.travelDate, travelers: c.adults + c.children, customerId: cust.id, message: draft.summary.slice(0, 500), lastContactAt: new Date() });
    return bk.id;
  });
  await syncTravelers(bookingId);
  // The plan becomes the order's itinerary (intent: customer), with no price: staff open it from "Price it".
  const content = (await applyBooking(draftToContent(draft, known, uid), bookingId)).content;
  await db.insert(s.itineraries).values({ name: `${c.name} — ${ref}`, content: JSON.stringify(content), bookingId, intent: "customer" });
  await db.update(s.aiConversations).set({ bookingId, updatedAt: new Date() }).where(eq(s.aiConversations.id, conv.id));
  const { notifyStaffNewOrder } = await import("../notifications"); await notifyStaffNewOrder(bookingId);
  const trackUrl = `${await linkOrigin()}/track/${ref}?t=${signRef(ref)}`;
  const g = await getSettings(); const company = companyFrom(g).name;
  const mail = brandedEmail({ greeting: `Thank you, ${c.name.split(" ")[0]}! We have your trip plan.`, lines: [`Your request ID is ${ref}: ${draft.title}, from ${c.travelDate}.`, "Our team will check it, fine-tune it and send you the price, usually within a day.", "You can follow it any time on your booking page."], buttonLabel: "Open your booking page", buttonUrl: trackUrl, footer: `${company}. Questions? Just reply to this email.`, builder: BUILDER_NAME });
  await sendEmail({ to: c.email, subject: `We received your trip plan (${ref})`, html: mail.html, text: mail.text, replyTo: g["company.email"] });
  return { ref, trackUrl };
}
