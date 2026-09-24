import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { sendEmail, brandedEmail } from "./email";
import { getSettings, staffAlertEmails } from "./settings";
import { BUILDER_NAME } from "./builder";
import { SITE } from "./format";

// Automatic emails: a confirmation to the customer and an alert to your team. Nothing is sent until email is set up (RESEND_API_KEY + EMAIL_FROM).
const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (n: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: 2 }).format(n);
const dateLong = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// The one place every notification email actually goes through — logs the attempt (success or failure) so the team can
// check whether something was actually sent, instead of just hoping it was. Never throws: a logging problem must never
// break the booking, payment or status change that triggered it.
export type NotifyType = "NEW_BOOKING" | "NEW_LEAD" | "PAYMENT_COMPLETE" | "ORDER_CANCELLED" | "CORPORATE_PAYMENT_COMPLETE" | "CORPORATE_CANCELLED" | "REVIEW_INVITE" | "STAFF_NEW_ORDER";
export async function notify(type: NotifyType, to: string | string[], subject: string, html: string, text: string, opts: { replyTo?: string; bookingId?: string; corporateRequestId?: string } = {}) {
  const recipient = Array.isArray(to) ? to.join(", ") : to;
  const res = await sendEmail({ to, subject, html, text, replyTo: opts.replyTo });
  if (res.ok || res.reason !== "NOT_CONFIGURED") {
    try { await db.insert(s.notificationLog).values({ type, recipient, subject, bookingId: opts.bookingId ?? null, corporateRequestId: opts.corporateRequestId ?? null, success: res.ok, error: res.ok ? null : res.message }); }
    catch (e) { console.error("notificationLog insert failed", e instanceof Error ? e.message : e); }
    if (!res.ok) console.error(`${type} email to ${recipient} failed: ${res.message}`);
  }
  return res;
}
const staffCard = (title: string, sub: string, rows: [string, string][], buttonLabel: string, buttonUrl: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;padding:20px;color:#141010"><h2 style="margin:0 0 4px">${esc(title)}</h2><p style="margin:0 0 14px;color:#6B6560">${esc(sub)}</p><table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#6B6560;width:120px">${esc(k)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join("")}</table><p style="margin-top:18px"><a href="${esc(buttonUrl)}" style="background:#141010;color:#F0B050;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">${esc(buttonLabel)}</a></p></div>`;
const staffText = (title: string, rows: [string, string][], buttonLabel: string, buttonUrl: string) => `${title}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${buttonLabel}: ${buttonUrl}`;

export type BookingMailData = { ref: string; name: string; email: string; whatsapp: string; tour: string; travelDate: string; adults: number; children: number; infants: number; total: number; deposit: number; currency: string; hotel: string; company: string; trackUrl: string; adminUrl: string; builder?: string };
export function bookingEmails(d: BookingMailData) {
  const people = [d.adults && `${d.adults} adult${d.adults > 1 ? "s" : ""}`, d.children && `${d.children} child${d.children > 1 ? "ren" : ""}`, d.infants && `${d.infants} infant${d.infants > 1 ? "s" : ""}`].filter(Boolean).join(", ");
  const customer = brandedEmail({
    greeting: `Hi ${d.name.split(" ")[0]}, we've got your booking request.`,
    lines: [`Your booking ID is ${d.ref}. ${d.tour} on ${dateLong(d.travelDate)} for ${people}.`, `Total: ${money(d.total, d.currency)}. A ${money(d.deposit, d.currency)} deposit confirms your booking. We'll send your invoice and payment details by WhatsApp and email shortly.`, "You can follow your booking, and download your documents, any time with the button below."],
    buttonLabel: "Track my booking", buttonUrl: d.trackUrl, footer: `${d.company}. Questions? Just reply to this email or message us on WhatsApp.`, builder: d.builder,
  });
  const rows: [string, string][] = [["Booking", d.ref], ["Customer", `${d.name} · ${d.email} · ${d.whatsapp}`], ["Experience", d.tour], ["Date", dateLong(d.travelDate)], ["Travelers", people], ["Total / deposit", `${money(d.total, d.currency)} / ${money(d.deposit, d.currency)}`], ...(d.hotel ? [["Hotel", d.hotel] as [string, string]] : [])];
  return { customer: { subject: `We've received your booking ${d.ref}`, ...customer },
    staff: { subject: `New booking ${d.ref}: ${d.name}, ${d.tour}, ${d.travelDate}`, html: staffCard(`New booking ${d.ref}`, "Reply to the customer on WhatsApp and send the invoice.", rows, "Open the order", d.adminUrl), text: staffText(`New booking ${d.ref}`, rows, "Open the order", d.adminUrl) } };
}
export type LeadMailData = { name: string; email: string; whatsapp: string; kind: string; country: string; message: string; travelDates: string; travelers: string; adminUrl: string };
export function leadEmail(d: LeadMailData) {
  const rows = ([["Type", d.kind.replace(/_/g, " ").toLowerCase()], ["Name", d.name], ["Email", d.email], ["WhatsApp", d.whatsapp], ["Country", d.country], ["Travel dates", d.travelDates], ["Travelers", d.travelers], ["Message", d.message]] as [string, string][]).filter(([, v]) => v);
  return { subject: `New inquiry: ${d.name}`, html: staffCard(`New inquiry from ${d.name}`, "", rows, "Open inquiries", d.adminUrl), text: staffText(`New inquiry from ${d.name}`, rows, "Open inquiries", d.adminUrl) };
}

// Called after the response has been sent, so a slow email service never slows the customer down. Failures are logged, never shown.
export async function notifyNewBooking(ref: string, token: string, origin: string = SITE) {
  try {
    const [r] = await db.select({ b: s.bookings, c: s.customers, t: s.tours }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.ref, ref)); if (!r) return;
    const g = await getSettings();
    const m = bookingEmails({ ref, name: r.b.guestName || r.c.name, email: r.c.email, whatsapp: r.c.whatsapp ?? "", tour: r.b.titleOverride || r.t.title, travelDate: r.b.travelDate, adults: r.b.adults, children: r.b.children, infants: r.b.infants, total: r.b.total, deposit: r.b.deposit, currency: r.b.currency, hotel: r.b.hotel ?? "", company: g["company.name"], trackUrl: `${origin}/track/${ref}?t=${token}`, adminUrl: `${origin}/admin?open=${r.b.id}`, builder: BUILDER_NAME });
    const staffTo = staffAlertEmails(g);
    await notify("NEW_BOOKING", r.c.email, m.customer.subject, m.customer.html, m.customer.text, { replyTo: g["company.email"] || undefined, bookingId: r.b.id });
    if (staffTo.length) await notify("NEW_BOOKING", staffTo, m.staff.subject, m.staff.html, m.staff.text, { replyTo: r.c.email, bookingId: r.b.id });
  } catch (e) { console.error("notifyNewBooking failed", e instanceof Error ? e.message : e); }
}
export async function notifyNewLead(leadId: string, origin: string = SITE) {
  try {
    const [l] = await db.select().from(s.leads).where(eq(s.leads.id, leadId)); if (!l) return; const g = await getSettings(); const to = staffAlertEmails(g); if (!to.length) return;
    const m = leadEmail({ name: l.name, email: l.email, whatsapp: l.whatsapp ?? "", kind: l.kind, country: l.country ?? "", message: l.message ?? l.interests ?? "", travelDates: l.travelDates ?? "", travelers: l.travelers ? String(l.travelers) : "", adminUrl: `${origin}/admin/leads` });
    await notify("NEW_LEAD", to, m.subject, m.html, m.text, { replyTo: l.email });
  } catch (e) { console.error("notifyNewLead failed", e instanceof Error ? e.message : e); }
}

export async function notifyStaffNewOrder(bookingId: string, origin: string = SITE) {
  try {
    const [r] = await db.select({ b: s.bookings, c: s.customers, t: s.tours }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.id, bookingId)); if (!r) return;
    const g = await getSettings(); const to = staffAlertEmails(g); if (!to.length) return;
    const rows: [string, string][] = [["Booking", r.b.ref], ["Customer", `${r.b.guestName || r.c.name} · ${r.c.email}`], ["Experience", r.b.titleOverride || r.t.title], ["Date", dateLong(r.b.travelDate)]];
    await notify("STAFF_NEW_ORDER", to, `New order created: ${r.b.ref} — ${r.b.guestName || r.c.name}`, staffCard(`New order ${r.b.ref}`, "Created directly in the admin.", rows, "Open the order", `${origin}/admin?open=${r.b.id}`), staffText(`New order ${r.b.ref}`, rows, "Open the order", `${origin}/admin?open=${r.b.id}`), { bookingId: r.b.id });
  } catch (e) { console.error("notifyStaffNewOrder failed", e instanceof Error ? e.message : e); }
}

// A booking reaching fully paid, or being cancelled, is genuinely worth a staff email — every partial payment or every
// status tweak is not, so those are the only two extra triggers added here, to avoid becoming noise nobody reads.
export async function notifyPaymentComplete(bookingId: string, origin: string = SITE) {
  try {
    const [r] = await db.select({ b: s.bookings, c: s.customers, t: s.tours }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.id, bookingId)); if (!r) return;
    const g = await getSettings(); const to = staffAlertEmails(g); if (!to.length) return;
    const rows: [string, string][] = [["Booking", r.b.ref], ["Customer", `${r.b.guestName || r.c.name} · ${r.c.email}`], ["Experience", r.b.titleOverride || r.t.title], ["Total paid", money(r.b.total, r.b.currency)]];
    await notify("PAYMENT_COMPLETE", to, `Fully paid: ${r.b.ref} — ${r.b.guestName || r.c.name}`, staffCard(`${r.b.ref} is now fully paid`, "Nothing left to collect on this order.", rows, "Open the order", `${origin}/admin?open=${r.b.id}`), staffText(`${r.b.ref} is now fully paid`, rows, "Open the order", `${origin}/admin?open=${r.b.id}`), { bookingId: r.b.id });
  } catch (e) { console.error("notifyPaymentComplete failed", e instanceof Error ? e.message : e); }
}
export async function notifyOrderCancelled(bookingId: string, origin: string = SITE) {
  try {
    const [r] = await db.select({ b: s.bookings, c: s.customers, t: s.tours }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.id, bookingId)); if (!r) return;
    const g = await getSettings(); const to = staffAlertEmails(g); if (!to.length) return;
    const { sql } = await import("drizzle-orm");
    const [paidRow] = await db.select({ paid: sql<number>`coalesce(sum(amount), 0)` }).from(s.payments).where(eq(s.payments.bookingId, bookingId));
    const paid = paidRow?.paid ?? 0;
    const rows: [string, string][] = [["Booking", r.b.ref], ["Customer", `${r.b.guestName || r.c.name} · ${r.c.email}`], ["Experience", r.b.titleOverride || r.t.title], ["Amount already paid", money(paid, r.b.currency)]];
    const sub = paid > 0 ? `This order was cancelled after ${money(paid, r.b.currency)} was already paid — check whether a refund is owed.` : "This order was cancelled. Nothing had been paid on it yet.";
    await notify("ORDER_CANCELLED", to, `Cancelled: ${r.b.ref} — ${r.b.guestName || r.c.name}`, staffCard(`${r.b.ref} was cancelled`, sub, rows, "Open the order", `${origin}/admin?open=${r.b.id}`), staffText(`${r.b.ref} was cancelled — ${sub}`, rows, "Open the order", `${origin}/admin?open=${r.b.id}`), { bookingId: r.b.id });
  } catch (e) { console.error("notifyOrderCancelled failed", e instanceof Error ? e.message : e); }
}

// Same two triggers, for corporate requests — kept in this same file and going through the same notify() logger, rather
// than a second parallel notification system.
export async function notifyCorporatePaymentComplete(requestId: string, origin: string = SITE) {
  try {
    const { loadCorporateRequest } = await import("./corporate");
    const data = await loadCorporateRequest(requestId); if (!data) return;
    const g = await getSettings(); const to = staffAlertEmails(g); if (!to.length) return;
    const { request: r, totals: t } = data;
    const rows: [string, string][] = [["Request", r.ref], ["Company", r.companyName], ["Total paid", money(t.price, r.currency)]];
    await notify("CORPORATE_PAYMENT_COMPLETE", to, `Fully paid: ${r.ref} — ${r.companyName}`, staffCard(`${r.ref} is now fully paid`, "Nothing left to collect on this corporate request.", rows, "Open the request", `${origin}/admin/corporate/${r.id}`), staffText(`${r.ref} is now fully paid`, rows, "Open the request", `${origin}/admin/corporate/${r.id}`), { corporateRequestId: r.id });
  } catch (e) { console.error("notifyCorporatePaymentComplete failed", e instanceof Error ? e.message : e); }
}
export async function notifyCorporateCancelled(requestId: string, origin: string = SITE) {
  try {
    const { loadCorporateRequest } = await import("./corporate");
    const data = await loadCorporateRequest(requestId); if (!data) return;
    const g = await getSettings(); const to = staffAlertEmails(g); if (!to.length) return;
    const { request: r, paid } = data;
    const rows: [string, string][] = [["Request", r.ref], ["Company", r.companyName], ["Amount already paid", money(paid, r.currency)]];
    const sub = paid > 0 ? `This request was cancelled after ${money(paid, r.currency)} was already paid — check whether a refund is owed.` : "This request was cancelled. Nothing had been paid on it yet.";
    await notify("CORPORATE_CANCELLED", to, `Cancelled: ${r.ref} — ${r.companyName}`, staffCard(`${r.ref} was cancelled`, sub, rows, "Open the request", `${origin}/admin/corporate/${r.id}`), staffText(`${r.ref} was cancelled — ${sub}`, rows, "Open the request", `${origin}/admin/corporate/${r.id}`), { corporateRequestId: r.id });
  } catch (e) { console.error("notifyCorporateCancelled failed", e instanceof Error ? e.message : e); }
}
