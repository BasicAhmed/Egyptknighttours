"use server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema as s } from "@/db";
import { requireStaff, PERMS, type Session } from "@/lib/auth";
import {
  newCorporateRef, loadCorporateRequest, logCorporate, normalizeServiceType, businessDay, servicePrices, requestTotals, paymentProblem, fmt,
  REQUEST_STATUS, REQUEST_STATUS_LABEL, SERVICE_STATUS, PRICING_MODES, PRICING_MODE_LABEL, CORPORATE_CURRENCIES, SERVICE_TYPE_LABEL,
} from "@/lib/corporate";

const audit = (userId: string, action: string, entity: string, entityId?: string) => db.insert(s.auditLogs).values({ userId, action, entity, entityId });
const go = (path: string, msg: string, err = false) => redirect(`${path}${path.includes("?") ? "&" : "?"}${err ? "e" : "n"}=${encodeURIComponent(msg)}`);
const page = (id: string) => `/admin/corporate/${id}`;
const str = (max: number) => z.string().trim().max(max).optional().default("");
const num0 = z.union([z.literal(""), z.coerce.number().int().min(0).max(999)]).optional().transform((v) => (v === "" || v == null ? null : v));
const isFinance = (u: Session) => PERMS.finance.includes(u.role);
const done = (id: string) => { revalidatePath(page(id)); revalidatePath("/admin/corporate"); revalidatePath("/admin/finance"); };

// Every action on a request first loads it: an id that no longer exists (deleted in another tab) gets a clear message
// instead of a silent "Saved" that changed nothing.
async function mustLoad(id: string) {
  const data = await loadCorporateRequest(id);
  if (!data) redirect("/admin/corporate?e=" + encodeURIComponent("That request no longer exists."));
  return data;
}

const requestSchema = z.object({
  companyName: z.string().trim().min(1, "Enter the requesting company.").max(160), companyContact: str(120),
  companyEmail: z.union([z.literal(""), z.string().trim().email("Company email: enter a valid email address.")]).optional().default(""), companyPhone: str(40),
  customerName: str(120), customerContact: str(160), customerCount: num0,
  serviceDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().default(""), location: str(200),
  notes: str(2000), requirements: str(2000),
  currency: z.enum(CORPORATE_CURRENCIES, { message: "Choose one of the listed currencies." }).optional().default("USD"),
  pricingMode: z.enum(PRICING_MODES).optional().default("ITEMIZED"),
  servicePercent: z.union([z.literal(""), z.coerce.number().min(0, "Service percentage can't be negative.").max(500, "Service percentage can be at most 500%.")]).optional().transform((v) => (v === "" || v == null ? null : v)),
}).refine((d) => d.pricingMode !== "PERCENTAGE" || d.servicePercent != null, { message: "Enter the service percentage.", path: ["servicePercent"] });

export async function createCorporateRequest(fd: FormData) {
  const u = await requireStaff("corporate");
  const p = requestSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go("/admin/corporate/new", p.error.issues[0]?.message ?? "Check the details and try again.", true);
  const ref = await newCorporateRef();
  const [r] = await db.insert(s.corporateRequests).values({ ref, ...p.data, servicePercent: p.data.pricingMode === "PERCENTAGE" ? p.data.servicePercent : null, serviceDate: p.data.serviceDate || null, createdById: u.uid }).returning();
  await audit(u.uid, "CREATE", "corporate_request", r.id);
  await logCorporate(r.id, "CREATED", `${r.ref} for ${r.companyName} · ${PRICING_MODE_LABEL[r.pricingMode]}${r.pricingMode === "PERCENTAGE" ? ` (${r.servicePercent}%)` : ""} · ${r.currency}`, u);
  revalidatePath("/admin/corporate");
  redirect(`${page(r.id)}?n=${encodeURIComponent("Request created. Add its services below.")}`);
}

export async function updateCorporateRequest(id: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const before = await mustLoad(id); const r0 = before.request;
  const p = requestSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(page(id), p.error.issues[0]?.message ?? "Check the details and try again.", true);
  const d = { ...p.data, servicePercent: p.data.pricingMode === "PERCENTAGE" ? p.data.servicePercent : null };

  // Money already received is in the request's currency: changing it afterwards would silently relabel those payments.
  if (d.currency !== r0.currency && before.payments.length)
    return go(page(id), `Payments are already recorded in ${r0.currency}. Remove them first if the request really is in ${d.currency}.`, true);

  const pricingChanged = d.pricingMode !== r0.pricingMode || (d.pricingMode === "PERCENTAGE" && d.servicePercent !== r0.servicePercent);
  // Moving from percentage to per-service pricing keeps what the partner was quoted: each service takes the price it had.
  const carry = r0.pricingMode === "PERCENTAGE" && d.pricingMode === "ITEMIZED";
  const nextServices = carry ? before.services.map((sv, i) => ({ ...sv, price: before.prices[i] || sv.price })) : before.services;
  const nextTotal = requestTotals(nextServices, d.pricingMode, d.servicePercent).price;
  if (pricingChanged && before.paid > 0 && nextTotal < before.paid - 0.005)
    return go(page(id), `That would make the total ${fmt(nextTotal, d.currency)}, less than the ${fmt(before.paid, d.currency)} already paid. Remove or correct a payment first.`, true);

  await db.transaction(async (tx) => {
    await tx.update(s.corporateRequests).set({ ...d, serviceDate: d.serviceDate || null }).where(eq(s.corporateRequests.id, id));
    if (carry) for (const [i, sv] of before.services.entries()) if (before.prices[i] && before.prices[i] !== sv.price) await tx.update(s.corporateServices).set({ price: before.prices[i] }).where(eq(s.corporateServices.id, sv.id));
  });
  await audit(u.uid, "UPDATE", "corporate_request", id);
  if (pricingChanged) {
    const was = `${PRICING_MODE_LABEL[r0.pricingMode]}${r0.pricingMode === "PERCENTAGE" ? ` ${r0.servicePercent ?? 0}%` : ""}`;
    const now = `${PRICING_MODE_LABEL[d.pricingMode]}${d.pricingMode === "PERCENTAGE" ? ` ${d.servicePercent}%` : ""}`;
    await logCorporate(id, "PRICING", `${was} → ${now}. Total ${fmt(before.totals.price, r0.currency)} → ${fmt(nextTotal, d.currency)}${carry ? ". Each service kept its price." : ""}`, u);
  }
  if (d.currency !== r0.currency) await logCorporate(id, "CURRENCY", `${r0.currency} → ${d.currency}. Amounts were not converted.`, u);
  const changed: string[] = (["companyName", "companyContact", "companyEmail", "companyPhone", "customerName", "customerContact", "customerCount", "location", "notes", "requirements"] as const).filter((k) => (d[k] ?? "") !== (r0[k] ?? ""));
  if ((d.serviceDate || null) !== r0.serviceDate) changed.push("serviceDate");
  if (changed.length) await logCorporate(id, "UPDATED", `Changed: ${changed.map((k) => FIELD[k] ?? k).join(", ")}`, u);
  done(id);
  return go(page(id), pricingChanged ? `Saved. The total is now ${fmt(nextTotal, d.currency)}.` : "Saved");
}
const FIELD: Record<string, string> = { companyName: "company", companyContact: "contact person", companyEmail: "company email", companyPhone: "company phone", customerName: "customer name", customerContact: "customer contact", customerCount: "number of people", serviceDate: "service date", location: "location", notes: "internal notes", requirements: "additional requirements" };

export async function setCorporateStatus(id: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const before = await mustLoad(id);
  const status = String(fd.get("status") ?? "");
  if (!(REQUEST_STATUS as readonly string[]).includes(status)) return go(page(id), "Not a valid status.", true);
  if (status === before.request.status) return go(page(id), "Status unchanged");
  await db.update(s.corporateRequests).set({ status }).where(eq(s.corporateRequests.id, id));
  await audit(u.uid, "STATUS", "corporate_request", id);
  await logCorporate(id, "STATUS", `${REQUEST_STATUS_LABEL[before.request.status] ?? before.request.status} → ${REQUEST_STATUS_LABEL[status]}${status === "CANCELLED" && before.paid > 0 ? ` (${fmt(before.paid, before.request.currency)} had been paid)` : ""}`, u);
  done(id);
  if (status === "CANCELLED") { const { notifyCorporateCancelled } = await import("@/lib/notifications"); await notifyCorporateCancelled(id); }
  return go(page(id), status === "CANCELLED" && before.paid > 0 ? `Cancelled. ${fmt(before.paid, before.request.currency)} was already paid: sort out the refund, then remove those payments if they are returned.` : "Status updated");
}

// Deleting removes the request, its services, payments and history for good. Owner/manager only, and never while money is
// recorded on it: a request that was paid is cancelled instead, so Finance and the record stay complete.
export async function deleteCorporateRequest(id: string) {
  const u = await requireStaff("corporate");
  if (!isFinance(u)) return go(page(id), "Only an owner or manager can delete a request. Set it to Cancelled instead.", true);
  const data = await mustLoad(id);
  if (data.payments.length) return go(page(id), `This request has ${fmt(data.paid, data.request.currency)} in payments recorded. Set it to Cancelled instead, or remove the payments first.`, true);
  await db.delete(s.corporateRequests).where(eq(s.corporateRequests.id, id));
  await audit(u.uid, "DELETE", "corporate_request", id); revalidatePath("/admin/corporate"); revalidatePath("/admin/finance");
  redirect("/admin/corporate?n=" + encodeURIComponent(`Request ${data.request.ref} deleted`));
}

const money = z.union([z.literal(""), z.coerce.number().min(0, "Amounts can't be negative.").max(1_000_000)]).optional().transform((v) => (v === "" || v == null ? undefined : v));
const serviceSchema = z.object({
  type: z.string().trim().min(1, "Enter a service type.").max(60).transform(normalizeServiceType), label: str(160),
  date: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().default(""), time: str(20), location: str(200), people: num0,
  // Cost is only on the form for owner/manager. For anyone else it is absent and the stored cost is kept.
  supplier: str(160), cost: money, price: money,
  status: z.enum(SERVICE_STATUS as unknown as [string, ...string[]]).optional().default("PENDING"), notes: str(1000),
});
const serviceName = (x: { type: string; label: string }) => `${SERVICE_TYPE_LABEL[x.type] ?? x.type}${x.label ? ` — ${x.label}` : ""}`;

export async function addCorporateService(requestId: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const data = await mustLoad(requestId); const r = data.request;
  const p = serviceSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(page(requestId), p.error.issues[0]?.message ?? "Check the service details.", true);
  if (r.pricingMode === "ITEMIZED" && p.data.price === undefined) return go(page(requestId), "Enter the service's selling price.", true);
  const cost = isFinance(u) ? p.data.cost ?? 0 : 0;
  const price = r.pricingMode === "ITEMIZED" ? p.data.price ?? 0 : 0; // percentage pricing works the price out from the cost
  const [row] = await db.insert(s.corporateServices).values({ requestId, ...p.data, cost, price, date: p.data.date || null }).returning();
  await audit(u.uid, "CREATE", "corporate_service", row.id);
  const after = await loadCorporateRequest(requestId);
  await logCorporate(requestId, "SERVICE_ADDED", `${serviceName(row)}${row.date ? ` on ${row.date}` : ""}. Total ${fmt(data.totals.price, r.currency)} → ${fmt(after?.totals.price ?? 0, r.currency)}`, u);
  done(requestId);
  return go(page(requestId), r.pricingMode === "PERCENTAGE" && !isFinance(u) ? "Service added. An owner or manager needs to enter its cost to price it." : "Service added");
}

export async function updateCorporateService(id: string, requestId: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const data = await mustLoad(requestId); const r = data.request;
  const sv = data.services.find((x) => x.id === id); // the service must belong to this request
  if (!sv) return go(page(requestId), "That service is no longer on this request.", true);
  const p = serviceSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(page(requestId), p.error.issues[0]?.message ?? "Check the service details.", true);
  const { cost, price, ...rest } = p.data;
  const set = {
    ...rest, date: rest.date || null,
    ...(isFinance(u) && cost !== undefined ? { cost } : {}), // only owner/manager can change a cost
    ...(r.pricingMode === "ITEMIZED" && price !== undefined ? { price } : {}),
  };
  await db.update(s.corporateServices).set(set).where(and(eq(s.corporateServices.id, id), eq(s.corporateServices.requestId, requestId)));
  await audit(u.uid, "UPDATE", "corporate_service", id);
  const after = await loadCorporateRequest(requestId);
  const totalNote = after && after.totals.price !== data.totals.price ? `. Total ${fmt(data.totals.price, r.currency)} → ${fmt(after.totals.price, r.currency)}` : "";
  const statusNote = rest.status !== sv.status ? ` (${sv.status.toLowerCase()} → ${rest.status.toLowerCase()})` : "";
  await logCorporate(requestId, "SERVICE_UPDATED", `${serviceName({ type: rest.type, label: rest.label })}${statusNote}${totalNote}`, u);
  done(requestId);
  return go(page(requestId), "Service updated");
}

export async function deleteCorporateService(id: string, requestId: string) {
  const u = await requireStaff("corporate");
  const data = await mustLoad(requestId);
  const sv = data.services.find((x) => x.id === id);
  if (!sv) return go(page(requestId), "That service was already removed.", true);
  await db.delete(s.corporateServices).where(and(eq(s.corporateServices.id, id), eq(s.corporateServices.requestId, requestId)));
  await audit(u.uid, "DELETE", "corporate_service", id);
  const after = await loadCorporateRequest(requestId);
  await logCorporate(requestId, "SERVICE_REMOVED", `${serviceName(sv)}. Total ${fmt(data.totals.price, data.request.currency)} → ${fmt(after?.totals.price ?? 0, data.request.currency)}`, u);
  done(requestId);
  return go(page(requestId), "Service removed");
}

export async function addCorporatePayment(requestId: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const before = await mustLoad(requestId); const r = before.request;
  const p = z.object({ amount: z.coerce.number().max(1_000_000), method: z.string().trim().max(40).optional().default("Bank transfer"), note: z.string().trim().max(300).optional().default("") }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(page(requestId), "Enter a valid amount.", true);
  const amount = Math.round(p.data.amount * 100) / 100;
  const problem = paymentProblem({ status: r.status, price: before.totals.price, paid: before.paid, amount, currency: r.currency });
  if (problem) return go(page(requestId), problem, true);
  await db.insert(s.corporatePayments).values({ requestId, amount, method: p.data.method || "Bank transfer", status: "PAID", note: p.data.note });
  await audit(u.uid, "CREATE", "corporate_payment", requestId);
  const after = await loadCorporateRequest(requestId);
  const left = after?.balance ?? 0;
  await logCorporate(requestId, "PAYMENT_ADDED", `${fmt(amount, r.currency)} · ${p.data.method}${p.data.note ? ` · ${p.data.note}` : ""}. ${left > 0.005 ? `${fmt(left, r.currency)} still due` : "Paid in full"}`, u);
  done(requestId);
  // Only the moment it reaches fully paid is worth an email, not every partial payment.
  if (left <= 0.005) { const { notifyCorporatePaymentComplete } = await import("@/lib/notifications"); await notifyCorporatePaymentComplete(requestId); }
  return go(page(requestId), left > 0.005 ? `Payment recorded. ${fmt(left, r.currency)} still due.` : "Payment recorded. The request is paid in full.");
}

// Undo a payment entered by mistake (wrong amount, wrong request) or returned to the partner. The row is kept as VOID for
// the record, never deleted; the balance, the invoice and Finance follow straight away, and the history says who removed it.
export async function removeCorporatePayment(paymentId: string, requestId: string) {
  const u = await requireStaff("corporate");
  const data = await mustLoad(requestId);
  const pay = data.payments.find((x) => x.id === paymentId);
  if (!pay) return go(page(requestId), "That payment was already removed.", true);
  await db.update(s.corporatePayments).set({ status: "VOID" }).where(and(eq(s.corporatePayments.id, paymentId), eq(s.corporatePayments.requestId, requestId), eq(s.corporatePayments.status, "PAID")));
  await audit(u.uid, "VOID_PAYMENT", "corporate_payment", requestId);
  const after = await loadCorporateRequest(requestId);
  const cur = data.request.currency;
  await logCorporate(requestId, "PAYMENT_REMOVED", `${fmt(pay.amount, cur)} · ${pay.method}${pay.note ? ` · ${pay.note}` : ""}, recorded ${businessDay(pay.createdAt)}. Now ${fmt(after?.paid ?? 0, cur)} paid, ${fmt(Math.max(0, after?.balance ?? 0), cur)} due`, u);
  done(requestId);
  return go(page(requestId), `Payment of ${fmt(pay.amount, cur)} removed. The balance was updated.`);
}

// The notes printed on the partner's invoice (payment deadline, what is included, thanks...). Kept apart from the
// request's internal notes, so nothing written for the team ends up on a document the partner receives.
export async function saveCorporateInvoiceNotes(id: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const data = await mustLoad(id);
  const p = z.object({ invoiceNotes: z.string().trim().max(2000, "Invoice notes can be up to 2,000 characters.").optional().default("") }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(page(id), p.error.issues[0]?.message ?? "Check the invoice notes.", true);
  if (p.data.invoiceNotes === data.request.invoiceNotes) return go(page(id), "Invoice notes unchanged");
  await db.update(s.corporateRequests).set({ invoiceNotes: p.data.invoiceNotes }).where(eq(s.corporateRequests.id, id));
  await audit(u.uid, "UPDATE_INVOICE_NOTES", "corporate_request", id);
  await logCorporate(id, "INVOICE_NOTES", p.data.invoiceNotes ? "Updated" : "Cleared", u);
  done(id);
  return go(page(id), "Invoice notes saved");
}
