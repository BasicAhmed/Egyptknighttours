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

export type BookingMailData = { ref: string; name: string; email: string; whatsapp: string; tour: string; travelDate: string; adults: number; children: number; infants: number; total: number; deposit: number; currency: string; hotel: string; company: string; trackUrl: string; adminUrl: string; builder?: string };
export function bookingEmails(d: BookingMailData) {
  const people = [d.adults && `${d.adults} adult${d.adults > 1 ? "s" : ""}`, d.children && `${d.children} child${d.children > 1 ? "ren" : ""}`, d.infants && `${d.infants} infant${d.infants > 1 ? "s" : ""}`].filter(Boolean).join(", ");
  const customer = brandedEmail({
    greeting: `Hi ${d.name.split(" ")[0]}, we've got your booking request.`,
    lines: [`Your booking ID is ${d.ref}. ${d.tour} on ${dateLong(d.travelDate)} for ${people}.`, `Total: ${money(d.total, d.currency)}. A ${money(d.deposit, d.currency)} deposit confirms your booking. We'll send your invoice and payment details by WhatsApp and email shortly.`, "You can follow your booking, and download your documents, any time with the button below."],
    buttonLabel: "Track my booking", buttonUrl: d.trackUrl, footer: `${d.company}. Questions? Just reply to this email or message us on WhatsApp.`, builder: d.builder,
  });
  const lines = [["Booking", d.ref], ["Customer", `${d.name} · ${d.email} · ${d.whatsapp}`], ["Experience", d.tour], ["Date", dateLong(d.travelDate)], ["Travelers", people], ["Total / deposit", `${money(d.total, d.currency)} / ${money(d.deposit, d.currency)}`], ...(d.hotel ? [["Hotel", d.hotel]] : [])];
  const staffHtml = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;padding:20px;color:#141010"><h2 style="margin:0 0 4px">New booking ${esc(d.ref)}</h2><p style="margin:0 0 14px;color:#6B6560">Reply to the customer on WhatsApp and send the invoice.</p><table style="width:100%;border-collapse:collapse;font-size:14px">${lines.map(([k, v]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#6B6560;width:120px">${esc(k)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join("")}</table><p style="margin-top:18px"><a href="${esc(d.adminUrl)}" style="background:#141010;color:#F0B050;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Open the order</a></p></div>`;
  const staffText = `New booking ${d.ref}\n\n${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nOpen the order: ${d.adminUrl}`;
  return { customer: { subject: `We've received your booking ${d.ref}`, ...customer }, staff: { subject: `New booking ${d.ref}: ${d.name}, ${d.tour}, ${d.travelDate}`, html: staffHtml, text: staffText } };
}
export type LeadMailData = { name: string; email: string; whatsapp: string; kind: string; country: string; message: string; travelDates: string; travelers: string; adminUrl: string };
export function leadEmail(d: LeadMailData) {
  const rows = [["Type", d.kind.replace(/_/g, " ").toLowerCase()], ["Name", d.name], ["Email", d.email], ["WhatsApp", d.whatsapp], ["Country", d.country], ["Travel dates", d.travelDates], ["Travelers", d.travelers], ["Message", d.message]].filter(([, v]) => v);
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;padding:20px;color:#141010"><h2 style="margin:0 0 14px">New inquiry from ${esc(d.name)}</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#6B6560;width:110px;vertical-align:top">${esc(k)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join("")}</table><p style="margin-top:18px"><a href="${esc(d.adminUrl)}" style="background:#141010;color:#F0B050;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Open inquiries</a></p></div>`;
  return { subject: `New inquiry: ${d.name}`, html, text: `New inquiry from ${d.name}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${d.adminUrl}` };
}

// Called after the response has been sent, so a slow email service never slows the customer down. Failures are logged, never shown.
export async function notifyNewBooking(ref: string, token: string, origin: string = SITE) {
  try {
    const [r] = await db.select({ b: s.bookings, c: s.customers, t: s.tours }).from(s.bookings).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id)).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).where(eq(s.bookings.ref, ref)); if (!r) return;
    const g = await getSettings();
    const m = bookingEmails({ ref, name: r.b.guestName || r.c.name, email: r.c.email, whatsapp: r.c.whatsapp ?? "", tour: r.b.titleOverride || r.t.title, travelDate: r.b.travelDate, adults: r.b.adults, children: r.b.children, infants: r.b.infants, total: r.b.total, deposit: r.b.deposit, currency: r.b.currency, hotel: r.b.hotel ?? "", company: g["company.name"], trackUrl: `${origin}/track/${ref}?t=${token}`, adminUrl: `${origin}/admin?open=${r.b.id}`, builder: BUILDER_NAME });
    const staffTo = staffAlertEmails(g);
    const a = await sendEmail({ to: r.c.email, subject: m.customer.subject, html: m.customer.html, text: m.customer.text, replyTo: g["company.email"] || undefined });
    const b = staffTo.length ? await sendEmail({ to: staffTo, subject: m.staff.subject, html: m.staff.html, text: m.staff.text, replyTo: r.c.email }) : null;
    for (const [who, res] of [["customer", a], ["staff", b]] as const) if (res && !res.ok && res.reason !== "NOT_CONFIGURED") console.error(`booking ${ref}: ${who} email failed: ${res.message}`);
  } catch (e) { console.error("notifyNewBooking failed", e instanceof Error ? e.message : e); }
}
export async function notifyNewLead(leadId: string, origin: string = SITE) {
  try {
    const [l] = await db.select().from(s.leads).where(eq(s.leads.id, leadId)); if (!l) return; const g = await getSettings(); const to = staffAlertEmails(g); if (!to.length) return;
    const m = leadEmail({ name: l.name, email: l.email, whatsapp: l.whatsapp ?? "", kind: l.kind, country: l.country ?? "", message: l.message ?? l.interests ?? "", travelDates: l.travelDates ?? "", travelers: l.travelers ? String(l.travelers) : "", adminUrl: `${origin}/admin/leads` });
    const res = await sendEmail({ to, subject: m.subject, html: m.html, text: m.text, replyTo: l.email });
    if (!res.ok && res.reason !== "NOT_CONFIGURED") console.error(`lead ${leadId}: staff email failed: ${res.message}`);
  } catch (e) { console.error("notifyNewLead failed", e instanceof Error ? e.message : e); }
}
