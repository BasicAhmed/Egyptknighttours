"use server";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";

const go = (msg: string, err = false): never => redirect(`/admin/settings?tab=reviews&${err ? "e" : "n"}=${encodeURIComponent(msg)}`);
const httpsOrEmpty = z.string().trim().max(500).refine((v) => v === "" || /^https:\/\//i.test(v), "Links must start with https://");
const schema = z.object({ name: z.string().trim().min(1).max(80), country: z.string().trim().max(60), rating: z.coerce.number().int().min(1).max(5), title: z.string().trim().max(140), body: z.string().trim().min(10).max(1200), source: z.string().trim().max(40), url: httpsOrEmpty, reviewDate: z.string().trim().max(30), sortOrder: z.coerce.number().int().min(0).max(999) });
const audit = (uid: string, action: string, id?: string) => db.insert(s.auditLogs).values({ userId: uid, action, entity: "testimonial", entityId: id });

export async function saveTestimonial(id: string | null, fd: FormData) {
  const u = await requireStaff("settings");
  const p = schema.safeParse(Object.fromEntries(fd.entries())); if (!p.success) return go(p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "), true);
  const row = { ...p.data, active: fd.get("active") === "on" };
  if (id) await db.update(s.testimonials).set(row).where(eq(s.testimonials.id, id)); else await db.insert(s.testimonials).values(row);
  await audit(u.uid, id ? "UPDATE" : "CREATE", id ?? undefined); revalidatePath("/"); revalidatePath("/admin/settings");
  return go("Review saved. It's live on the homepage.");
}
export async function deleteTestimonial(id: string) {
  const u = await requireStaff("settings"); await db.delete(s.testimonials).where(eq(s.testimonials.id, id)); await audit(u.uid, "DELETE", id); revalidatePath("/"); return go("Review removed");
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
  await audit(u.uid, "BULK_CREATE"); revalidatePath("/"); revalidatePath("/admin/settings");
  return go(n ? `${n} review${n > 1 ? "s" : ""} added` : "Nothing added. Use one review per line: Name | Country | Date | Title | Review text", !n);
}
