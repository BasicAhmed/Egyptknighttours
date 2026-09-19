import { db, schema as s } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { SITE, parseJson } from "./format";
import { getSettings, companyFrom } from "./settings";
import { signRef } from "./booking-token";
import type { InvoiceData, PayMethod } from "@/pdf/types";

export type InvoiceOptions = { currency?: string; dueNow?: number; deadline?: string; extras?: { label: string; amount: number }[]; notes?: string };
const r2 = (n: number) => Math.round(n * 100) / 100;
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const todayISO = () => new Date().toISOString().slice(0, 10);

export async function activeMethods(currency?: string): Promise<PayMethod[]> {
  const rows = await db.select().from(s.paymentMethods).where(eq(s.paymentMethods.active, true)).orderBy(asc(s.paymentMethods.sortOrder), asc(s.paymentMethods.createdAt));
  const all = rows.map((m) => ({ id: m.id, kind: m.kind, label: m.label, currency: m.currency, bankName: m.bankName, accountName: m.accountName, accountNumber: m.accountNumber, iban: m.iban, swift: m.swift, branch: m.branch, bankAddress: m.bankAddress, instructions: m.instructions, paymentUrl: m.paymentUrl }));
  const match = currency ? all.filter((m) => !m.currency || m.currency.toUpperCase() === currency.toUpperCase()) : all;
  return match.length ? match : all;
}

export async function buildInvoiceData(bookingId: string, opts: InvoiceOptions = {}, version = 1): Promise<InvoiceData | null> {
  const [row] = await db.select({ b: s.bookings, tour: s.tours, dest: s.destinations, c: s.customers })
    .from(s.bookings).innerJoin(s.tours, eq(s.bookings.tourId, s.tours.id)).innerJoin(s.destinations, eq(s.tours.destinationId, s.destinations.id)).innerJoin(s.customers, eq(s.bookings.customerId, s.customers.id))
    .where(eq(s.bookings.id, bookingId));
  if (!row) return null;
  const { b, tour, dest, c } = row;
  const g = await getSettings();
  const payments = await db.select().from(s.payments).where(and(eq(s.payments.bookingId, b.id), eq(s.payments.status, "PAID")));
  const paid = r2(payments.reduce((a, p) => a + p.amount, 0));
  const currency = (opts.currency || b.currency || "USD").toUpperCase();
  const people = b.adults + b.children;
  const addons = parseJson<{ name: string; price: number; unit: string }[]>(b.addonsJson, []);
  const addonLines = addons.map((a) => ({ label: a.name, amount: r2(a.unit === "PER_PERSON" ? a.price * people : a.price) }));
  const tourAmount = r2(b.subtotal - addonLines.reduce((a, l) => a + l.amount, 0));
  const travelers = `${b.adults} adult${b.adults > 1 ? "s" : ""}${b.children ? `, ${b.children} child${b.children > 1 ? "ren" : ""}` : ""}${b.infants ? `, ${b.infants} infant${b.infants > 1 ? "s" : ""}` : ""}`;
  const extras = (opts.extras ?? []).filter((e) => e.label && Number.isFinite(e.amount));
  const total = r2(b.subtotal - b.discount + extras.reduce((a, e) => a + e.amount, 0));
  const balance = Math.max(0, r2(total - paid));
  const today = todayISO();

  // Default amount and deadline follow the payment option the customer chose at booking. Staff can override both.
  const depositTarget = b.payMode === "FULL" ? total : b.payMode === "DEPOSIT" ? Math.min(total, b.deposit) : 0;
  const depositPending = paid < depositTarget - 0.005;
  const defDue = b.payMode === "FULL" ? balance : depositPending ? r2(depositTarget - paid) : balance;
  const dueNow = Math.min(balance, r2(opts.dueNow ?? defDue));
  const depDays = Number(g["invoice.depositDeadlineDays"]) || 3, balDays = Number(g["invoice.balanceDaysBefore"]) || 21;
  const balDeadline = addDays(b.travelDate, -balDays);
  const deadline = opts.deadline || (depositPending || b.payMode === "FULL" ? addDays(today, depDays) : balDeadline > today ? balDeadline : addDays(today, 2));
  const deadlineNote = balance <= 0 ? "" : dueNow >= balance ? "Payment in full" : depositPending ? "Deposit to confirm your booking" : `Balance due ${balDays} days before travel`;
  const methods = await activeMethods(currency);
  const linkMethod = methods.find((m) => m.paymentUrl);
  const list = (k: string) => g[k].split("\n").map((x) => x.trim()).filter(Boolean);
  return {
    number: `INV-${b.ref}-${version}`, issuedAt: today, currency, ref: b.ref,
    customer: { name: c.name, email: c.email, phone: c.whatsapp || c.phone || "", country: c.country || "" },
    trip: { title: b.titleOverride || tour.title, destination: dest.name, date: b.travelDate, travelers, style: b.isPrivate ? "Private" : "Shared", pickup: [b.hotel, b.pickupLocation].filter(Boolean).join(" · "), includes: parseJson<string[]>(tour.included, []) },
    lines: [{ label: `${b.titleOverride || tour.title} (${travelers})`, amount: tourAmount }, ...addonLines], subtotal: r2(b.subtotal), discount: r2(b.discount), extras,
    total, paid, balance, dueNow, deadline, deadlineNote, methods, ctaUrl: linkMethod?.paymentUrl ?? "", trackUrl: `${SITE}/track/${b.ref}?t=${signRef(b.ref)}`,
    terms: { payment: list("invoice.paymentTerms"), documents: list("invoice.documents"), cancellation: list("invoice.cancellation"), note: g["invoice.note"] },
    company: companyFrom(g), notes: opts.notes ?? "",
  };
}
