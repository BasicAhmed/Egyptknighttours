"use server";
import { db, schema as s } from "../../db";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "../../lib/auth";
import { tourSchema, LEAD_STATUS, BOOKING_STATUS } from "../../lib/validation";

const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
const pairs = (v: FormDataEntryValue | null, a: string, b: string) => lines(v).map((l) => { const [x, ...y] = l.split("|"); return { [a]: x.trim(), [b]: y.join("|").trim() }; }).filter((o) => o[a]);
const audit = (userId: string, action: string, entity: string, entityId?: string) => db.insert(s.auditLogs).values({ userId, action, entity, entityId });

function tourFromForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  const parsed = tourSchema.safeParse({ ...raw, discountPrice: raw.discountPrice === "" ? null : raw.discountPrice });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  return { data: {
    ...parsed.data, discountPrice: parsed.data.discountPrice ?? null, imageUrl: parsed.data.imageUrl || null,
    isPrivateAvailable: fd.get("isPrivateAvailable") === "on", isGroupAvailable: fd.get("isGroupAvailable") === "on",
    highlights: JSON.stringify(lines(fd.get("highlights"))), included: JSON.stringify(lines(fd.get("included"))), excluded: JSON.stringify(lines(fd.get("excluded"))),
    itinerary: JSON.stringify(pairs(fd.get("itinerary"), "title", "text")), faqs: JSON.stringify(pairs(fd.get("faqs"), "q", "a")),
    pickupInfo: String(fd.get("pickupInfo") ?? ""), meetingPoint: String(fd.get("meetingPoint") ?? ""), whatToBring: String(fd.get("whatToBring") ?? ""), cancellationPolicy: String(fd.get("cancellationPolicy") ?? ""),
    updatedAt: new Date(),
  } };
}
export async function saveTour(id: string | null, fd: FormData) {
  const u = await requireStaff("tours");
  const r = tourFromForm(fd);
  const back = id ? `/admin/tours/${id}` : "/admin/tours/new";
  if (r.error || !r.data) redirect(`${back}?error=${encodeURIComponent(r.error ?? "Invalid")}`);
  const dupe = await db.select({ id: s.tours.id }).from(s.tours).where(eq(s.tours.slug, r.data.slug));
  if (dupe.length && dupe[0].id !== id) redirect(`${back}?error=${encodeURIComponent("Slug already used")}`);
  if (id) { await db.update(s.tours).set(r.data).where(eq(s.tours.id, id)); await audit(u.uid, "UPDATE", "tour", id); }
  else { const [n] = await db.insert(s.tours).values(r.data).returning(); await audit(u.uid, "CREATE", "tour", n.id); }
  revalidatePath("/tours"); revalidatePath("/");
  redirect("/admin/tours?saved=1");
}
export async function deleteTour(id: string) {
  const u = await requireStaff("tours");
  const has = await db.select({ id: s.bookings.id }).from(s.bookings).where(eq(s.bookings.tourId, id)).limit(1);
  if (has.length) { await db.update(s.tours).set({ status: "ARCHIVED" }).where(eq(s.tours.id, id)); await audit(u.uid, "ARCHIVE", "tour", id); }
  else { await db.delete(s.addons).where(eq(s.addons.tourId, id)); await db.delete(s.reviews).where(eq(s.reviews.tourId, id)); await db.delete(s.tours).where(eq(s.tours.id, id)); await audit(u.uid, "DELETE", "tour", id); }
  revalidatePath("/tours"); revalidatePath("/admin/tours");
}
export async function setLead(id: string, fd: FormData) {
  const u = await requireStaff("leads");
  const status = String(fd.get("status"));
  if (!(LEAD_STATUS as readonly string[]).includes(status)) return;
  const next = String(fd.get("next") ?? "");
  const notes = String(fd.get("notes") ?? "").slice(0, 2000);
  await db.update(s.leads).set({ status, notes, nextFollowUpAt: next ? new Date(next) : null, lastContactAt: new Date(), assignedToId: u.uid }).where(eq(s.leads.id, id));
  await db.insert(s.leadEvents).values({ leadId: id, type: "STATUS_" + status, note: notes || null });
  if (["BOOKED", "LOST"].includes(status)) await db.update(s.followUps).set({ status: "SKIPPED" }).where(and(eq(s.followUps.leadId, id), eq(s.followUps.status, "SCHEDULED")));
  await audit(u.uid, "UPDATE", "lead", id); revalidatePath("/admin/leads");
}
export async function setBooking(id: string, fd: FormData) {
  const u = await requireStaff("bookings");
  const status = String(fd.get("status"));
  if (!(BOOKING_STATUS as readonly string[]).includes(status)) return;
  await db.update(s.bookings).set({ status }).where(eq(s.bookings.id, id));
  if (status === "DEPOSIT_PAID" || status === "PAID") await db.update(s.payments).set({ status: "PAID" }).where(and(eq(s.payments.bookingId, id), eq(s.payments.status, "PENDING")));
  await audit(u.uid, "UPDATE", "booking", id); revalidatePath("/admin/bookings");
}
