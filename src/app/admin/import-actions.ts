"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { invalidate } from "@/lib/cache";
import { importTours } from "@/lib/import-tours";
import { slugify } from "@/lib/csv";

const back = (msg: string, err = false): never => redirect(`/admin/tours/import?${err ? "e" : "n"}=${encodeURIComponent(msg.slice(0, 900))}`);
export async function runTourImport(fd: FormData) {
  const u = await requireStaff("tours"); const g = await getSettings();
  const file = fd.get("file"); let csv = String(fd.get("csv") ?? "");
  if (file instanceof File && file.size > 0) { if (file.size > 2_000_000) return back("That file is too large (2 MB limit).", true); csv = await file.text(); }
  if (csv.trim().length < 20) return back("Paste your spreadsheet (as CSV) or choose a CSV file first.", true);
  const hosts = String(fd.get("hosts") ?? "").split(/[\s,;]+/).map((h) => h.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim()).filter(Boolean); if (g["company.website"]) hosts.push(g["company.website"].replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
  const r = await importTours(csv, { imageHosts: hosts, skipImages: fd.get("skipImages") === "on", company: g["company.name"], userId: u.uid });
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "IMPORT", entity: "tours" }); invalidate("tours", "destinations"); revalidatePath("/tours");
  const bits = [`${r.created.length} tour${r.created.length === 1 ? "" : "s"} imported as drafts`]; if (r.skipped.length) bits.push(`${r.skipped.length} skipped: ${r.skipped.slice(0, 4).join("; ")}${r.skipped.length > 4 ? "…" : ""}`); if (r.warnings.length) bits.push(`${r.warnings.length} notes: ${r.warnings.slice(0, 3).join("; ")}${r.warnings.length > 3 ? "…" : ""}`);
  return back(bits.join(". "), r.created.length === 0);
}
export async function createDestination(fd: FormData) {
  const u = await requireStaff("tours"); const name = String(fd.get("name") ?? "").trim().slice(0, 80); if (name.length < 2) redirect("/admin/destinations/new?e=" + encodeURIComponent("Enter a name"));
  const slug = slugify(name); const [dupe] = await db.select({ id: s.destinations.id }).from(s.destinations).where(eq(s.destinations.slug, slug));
  if (dupe) redirect(`/admin/destinations/${dupe.id}`);
  const [d] = await db.insert(s.destinations).values({ slug, name, tagline: String(fd.get("tagline") || `${name} tours and things to do`).slice(0, 140), overview: String(fd.get("overview") || `Explore ${name} with a local team. Browse the tours below, or tell us what you would like.`).slice(0, 3000), bestTime: "Ask us for the best time to visit on your dates.", howToGet: "We arrange pickups and transfers for every tour.", whereToStay: "Tell us your budget and we will suggest hotels.", tips: "Message us on WhatsApp for local tips.", recommendedDays: "Ask us", seoTitle: `${name} Tours and Things to Do`.slice(0, 70), seoDescription: `Book tours in ${name} with a local team. Clear prices and easy booking.`.slice(0, 165) }).returning();
  await db.insert(s.auditLogs).values({ userId: u.uid, action: "CREATE", entity: "destination", entityId: d.id }); invalidate("destinations"); revalidatePath("/destinations");
  redirect(`/admin/destinations/${d.id}`);
}
