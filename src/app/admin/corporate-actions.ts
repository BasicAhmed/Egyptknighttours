"use server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema as s } from "@/db";
import { requireStaff, PERMS } from "@/lib/auth";
import { newCorporateRef, SERVICE_TYPES, REQUEST_STATUS, SERVICE_STATUS } from "@/lib/corporate";

const audit = (userId: string, action: string, entity: string, entityId?: string) => db.insert(s.auditLogs).values({ userId, action, entity, entityId });
const go = (path: string, msg: string, err = false) => redirect(`${path}${path.includes("?") ? "&" : "?"}${err ? "e" : "n"}=${encodeURIComponent(msg)}`);
const str = (max: number) => z.string().trim().max(max).optional().default("");
const num0 = z.union([z.literal(""), z.coerce.number().int().min(0).max(999)]).optional().transform((v) => (v === "" || v == null ? null : v));

const requestSchema = z.object({
  companyName: z.string().trim().min(1).max(160), companyContact: str(120), companyEmail: z.union([z.literal(""), z.string().trim().email()]).optional().default(""), companyPhone: str(40),
  customerName: str(120), customerContact: str(160), customerCount: num0,
  serviceDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().default(""), location: str(200),
  notes: str(2000), requirements: str(2000), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional().default("USD"),
});

export async function createCorporateRequest(fd: FormData) {
  const u = await requireStaff("corporate");
  const p = requestSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go("/admin/corporate/new", p.error.issues[0]?.message ?? "Check the details and try again.", true);
  const ref = await newCorporateRef();
  const [r] = await db.insert(s.corporateRequests).values({ ref, ...p.data, serviceDate: p.data.serviceDate || null, createdById: u.uid }).returning();
  await audit(u.uid, "CREATE", "corporate_request", r.id); revalidatePath("/admin/corporate");
  redirect(`/admin/corporate/${r.id}?n=${encodeURIComponent("Request created — add its services below.")}`);
}

export async function updateCorporateRequest(id: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const p = requestSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(`/admin/corporate/${id}`, p.error.issues[0]?.message ?? "Check the details and try again.", true);
  await db.update(s.corporateRequests).set({ ...p.data, serviceDate: p.data.serviceDate || null }).where(eq(s.corporateRequests.id, id));
  await audit(u.uid, "UPDATE", "corporate_request", id); revalidatePath(`/admin/corporate/${id}`);
  return go(`/admin/corporate/${id}`, "Saved");
}

export async function setCorporateStatus(id: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const status = String(fd.get("status") ?? "");
  if (!(REQUEST_STATUS as readonly string[]).includes(status)) return go(`/admin/corporate/${id}`, "Not a valid status.", true);
  await db.update(s.corporateRequests).set({ status }).where(eq(s.corporateRequests.id, id));
  await audit(u.uid, "STATUS", "corporate_request", id); revalidatePath(`/admin/corporate/${id}`);
  return go(`/admin/corporate/${id}`, "Status updated");
}

export async function deleteCorporateRequest(id: string) {
  const u = await requireStaff("corporate");
  await db.delete(s.corporateRequests).where(eq(s.corporateRequests.id, id));
  await audit(u.uid, "DELETE", "corporate_request", id); revalidatePath("/admin/corporate");
  redirect("/admin/corporate?n=" + encodeURIComponent("Request deleted"));
}

const serviceSchema = z.object({
  type: z.enum(SERVICE_TYPES.map((t) => t[0]) as [string, ...string[]]), label: str(160),
  date: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().default(""), time: str(20), location: str(200), people: num0,
  supplier: str(160), cost: z.coerce.number().min(0).max(1_000_000), price: z.coerce.number().min(0).max(1_000_000),
  status: z.enum(SERVICE_STATUS as unknown as [string, ...string[]]).optional().default("PENDING"), notes: str(1000),
});

export async function addCorporateService(requestId: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const p = serviceSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(`/admin/corporate/${requestId}`, p.error.issues[0]?.message ?? "Check the service details.", true);
  const [row] = await db.insert(s.corporateServices).values({ requestId, ...p.data, date: p.data.date || null }).returning();
  await audit(u.uid, "CREATE", "corporate_service", row.id); revalidatePath(`/admin/corporate/${requestId}`);
  return go(`/admin/corporate/${requestId}`, "Service added");
}

export async function updateCorporateService(id: string, requestId: string, fd: FormData) {
  const u = await requireStaff("corporate");
  const p = serviceSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(`/admin/corporate/${requestId}`, p.error.issues[0]?.message ?? "Check the service details.", true);
  await db.update(s.corporateServices).set({ ...p.data, date: p.data.date || null }).where(eq(s.corporateServices.id, id));
  await audit(u.uid, "UPDATE", "corporate_service", id); revalidatePath(`/admin/corporate/${requestId}`);
  return go(`/admin/corporate/${requestId}`, "Service updated");
}

export async function deleteCorporateService(id: string, requestId: string) {
  const u = await requireStaff("corporate");
  await db.delete(s.corporateServices).where(eq(s.corporateServices.id, id));
  await audit(u.uid, "DELETE", "corporate_service", id); revalidatePath(`/admin/corporate/${requestId}`);
  return go(`/admin/corporate/${requestId}`, "Service removed");
}
