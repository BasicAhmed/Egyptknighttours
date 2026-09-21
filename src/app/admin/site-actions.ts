"use server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { invalidate } from "@/lib/cache";
import { parseGuides } from "@/lib/guides-import";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/format";
import { normalizePath, normalizeTarget, parseRedirectList } from "@/lib/legacy";

const go = (msg: string, err = false, tab = "reviews"): never => redirect(`/admin/settings?tab=${tab}&${err ? "e" : "n"}=${encodeURIComponent(msg)}`);
const httpsOrEmpty = z.string().trim().max(500).refine((v) => v === "" || /^https:\/\//i.test(v), "Links must start with https://");
const schema = z.object({ name: z.string().trim().min(1).max(80), country: z.string().trim().max(60), rating: z.coerce.number().int().min(1).max(5), title: z.string().trim().max(140), body: z.string().trim().min(10).max(1200), source: z.string().trim().max(40), url: httpsOrEmpty, reviewDate: z.string().trim().max(30), sortOrder: z.coerce.number().int().min(0).max(999) });
const audit = (uid: string, action: string, id?: string) => db.insert(s.auditLogs).values({ userId: uid, action, entity: "testimonial", entityId: id });

export async function saveTestimonial(id: string | null, fd: FormData) {
  const u = await requireStaff("settings");
  const p = schema.safeParse(Object.fromEntries(fd.entries())); if (!p.success) return go(p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "), true);
  const row = { ...p.data, active: fd.get("active") === "on" };
  if (id) await db.update(s.testimonials).set(row).where(eq(s.testimonials.id, id)); else await db.insert(s.testimonials).values(row);
  await audit(u.uid, id ? "UPDATE" : "CREATE", id ?? undefined); revalidatePath("/"); revalidatePath("/admin/settings"); invalidate("testimonials");
  return go("Review saved. It's live on the homepage.");
}
export async function deleteTestimonial(id: string) {
  const u = await requireStaff("settings"); await db.delete(s.testimonials).where(eq(s.testimonials.id, id)); await audit(u.uid, "DELETE", id); revalidatePath("/"); invalidate("testimonials"); return go("Review removed");
}
// One review per line: Name | Country | Date | Title | Review text
export async function bulkAddTestimonials(fd: FormData) {
  const u = await requireStaff("settings");
  const source = String(fd.get("source") ?? "Tripadvisor").slice(0, 40) || "Tripadvisor"; const url = String(fd.get("url") ?? "").trim();
  if (url && !/^https:\/\//i.test(url)) return go("Link must start with https://", true);
  const lines = String(fd.get("bulk") ?? "").split("\n").map((l) => l.trim()).filter(Boolean); let n = 0;
  for (const l of lines.slice(0, 60)) {
    const [name, country, date, title, ...rest] = l.split("|").map((x) => x.trim()); const body = rest.join(" | ");
    const p = schema.safeParse({ name, country: country ?? "", rating: 5, title: title ?? "", body, source, url, reviewDate: date ?? "", sortOrder: 0 });
    if (p.success) { await db.insert(s.testimonials).values({ ...p.data, active: true }); n++; }
  }
  await audit(u.uid, "BULK_CREATE"); revalidatePath("/"); revalidatePath("/admin/settings"); invalidate("testimonials");
  return go(n ? `${n} review${n > 1 ? "s" : ""} added` : "Nothing added. Use one review per line: Name | Country | Date | Title | Review text", !n);
}

const guideSchema = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(30), languages: z.string().trim().max(120), notes: z.string().trim().max(300) });
export async function saveGuide(id: string | null, fd: FormData) {
  const u = await requireStaff("settings");
  const p = guideSchema.safeParse(Object.fromEntries(fd.entries())); if (!p.success) return go(p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "), true, "guides");
  const row = { ...p.data, active: fd.get("active") === "on" };
  if (id) await db.update(s.tourGuides).set(row).where(eq(s.tourGuides.id, id)); else await db.insert(s.tourGuides).values(row);
  await db.insert(s.auditLogs).values({ userId: u.uid, action: id ? "UPDATE" : "CREATE", entity: "tour_guide", entityId: id ?? undefined }); revalidatePath("/admin/settings");
  return go("Guide saved", false, "guides");
}
export async function deleteGuide(id: string) {
  const u = await requireStaff("settings");
  await db.update(s.bookings).set({ guideId: null }).where(eq(s.bookings.guideId, id)); await db.delete(s.tourGuides).where(eq(s.tourGuides.id, id));
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "DELETE", entity: "tour_guide", entityId: id }); revalidatePath("/admin/settings");
  return go("Guide removed. Their orders are now unassigned.", false, "guides");
}

// Paste a list (name, language, phone numbers) and every guide is added. Only the first number is kept. Guides that already exist are skipped.
export async function bulkAddGuides(fd: FormData) {
  const u = await requireStaff("settings");
  const list = parseGuides(String(fd.get("bulk") ?? "").slice(0, 60000));
  if (!list.length) return go("Nothing to add. Paste each guide as: name, language, phone number, with a blank line between guides.", true, "guides");
  const have = new Set((await db.select({ name: s.tourGuides.name }).from(s.tourGuides)).map((g) => g.name.toLowerCase())); let added = 0, skipped = 0, noPhone = 0;
  for (const g of list.slice(0, 200)) {
    if (have.has(g.name.toLowerCase())) { skipped++; continue; }
    await db.insert(s.tourGuides).values({ name: g.name.slice(0, 100), phone: g.phone, languages: g.languages, notes: "", active: true }); have.add(g.name.toLowerCase()); added++; if (!g.phone) noPhone++;
  }
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "BULK_CREATE", entity: "tour_guide" }); revalidatePath("/admin/settings");
  return go(`${added} guide${added === 1 ? "" : "s"} added${skipped ? `, ${skipped} skipped (already in the list)` : ""}${noPhone ? `, ${noPhone} without a phone number` : ""}.`, false, "guides");
}

// ---------- Redirects from the old website ----------
async function targetHosts() { const g = await getSettings(); let h = ""; try { h = new URL(SITE || "http://localhost").hostname; } catch { /* ignore */ } return [h, g["company.website"] ?? ""].filter(Boolean); }
async function putRedirect(fromIn: string, toIn: string, status: number, note: string, hosts: string[]): Promise<string | null> {
  const from = normalizePath(fromIn); const to = normalizeTarget(toIn, hosts);
  if (!from || from === "/") return `"${fromIn}" is not a usable old address`;
  if (!to) return `"${toIn}" must be a page on this site, starting with /`;
  const toPath = normalizePath(to); if (toPath === from) return `"${fromIn}" points to itself`;
  const [back] = toPath ? await db.select().from(s.redirects).where(eq(s.redirects.fromPath, toPath)) : []; if (back && normalizePath(back.toPath) === from) return `"${fromIn}" and "${toIn}" would send visitors round in a circle`;
  await db.insert(s.redirects).values({ fromPath: from, toPath: to, status: status === 302 ? 302 : 301, note: note.slice(0, 200) }).onConflictDoUpdate({ target: s.redirects.fromPath, set: { toPath: to, status: status === 302 ? 302 : 301, note: note.slice(0, 200) } });
  return null;
}
export async function saveRedirect(fd: FormData) {
  const u = await requireStaff("settings"); const err = await putRedirect(String(fd.get("from") ?? ""), String(fd.get("to") ?? ""), Number(fd.get("status") ?? 301), String(fd.get("note") ?? ""), await targetHosts());
  if (err) return go(err, true, "redirects");
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "CREATE", entity: "redirect" }); invalidate("redirects"); return go("Redirect saved", false, "redirects");
}
export async function bulkAddRedirects(fd: FormData) {
  const u = await requireStaff("settings"); const hosts = await targetHosts(); const { rows, errors } = parseRedirectList(String(fd.get("bulk") ?? "").slice(0, 200_000));
  let ok = 0; const bad: string[] = [...errors];
  for (const r of rows.slice(0, 3000)) { const e = await putRedirect(r.from, r.to, 301, "Imported", hosts); if (e) bad.push(`Line ${r.line}: ${e}`); else ok++; }
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "BULK_CREATE", entity: "redirect" }); invalidate("redirects");
  return go(`${ok} redirect${ok === 1 ? "" : "s"} saved${bad.length ? `. ${bad.length} skipped: ${bad.slice(0, 3).join("; ")}${bad.length > 3 ? "…" : ""}` : ""}`, ok === 0, "redirects");
}
export async function deleteRedirect(id: string) {
  const u = await requireStaff("settings"); await db.delete(s.redirects).where(eq(s.redirects.id, id));
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "DELETE", entity: "redirect", entityId: id }); invalidate("redirects"); return go("Redirect removed", false, "redirects");
}
