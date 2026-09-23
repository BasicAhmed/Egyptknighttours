"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, ne, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";

const ROLES = ["SUPER_ADMIN", "MANAGER", "SALES", "CONTENT_EDITOR", "TOUR_OPERATOR"] as const;
const go = (msg: string, err = false) => redirect(`/admin/staff?${err ? "e" : "n"}=${encodeURIComponent(msg)}`);

export async function createStaff(fd: FormData) {
  await requireStaff("staff");
  const p = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(8).max(200), role: z.enum(ROLES) }).safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return go(p.error.issues[0]?.message ?? "Check the details and try again.", true);
  const [existing] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, p.data.email));
  if (existing) return go("That email already has a staff account.", true);
  await db.insert(s.users).values({ email: p.data.email, name: p.data.name, passwordHash: await bcrypt.hash(p.data.password, 12), role: p.data.role });
  revalidatePath("/admin/staff");
  return go(`${p.data.name} can now log in.`);
}

export async function updateStaffRole(id: string, fd: FormData) {
  const u = await requireStaff("staff");
  const role = String(fd.get("role") ?? ""); if (!ROLES.includes(role as (typeof ROLES)[number])) return go("Not a valid role.", true);
  if (id === u.uid && role !== "SUPER_ADMIN") return go("You can't remove your own owner access. Ask another owner to change it.", true);
  if (role !== "SUPER_ADMIN") { const [{ n }] = await db.select({ n: s.users.id }).from(s.users).where(and(eq(s.users.role, "SUPER_ADMIN"), ne(s.users.id, id))).then((r) => [{ n: r.length }]);
    if (n === 0) return go("This is the last owner account — give owner access to someone else first.", true); }
  await db.update(s.users).set({ role }).where(eq(s.users.id, id));
  revalidatePath("/admin/staff"); return go("Role updated.");
}

export async function resetStaffPassword(id: string, fd: FormData) {
  await requireStaff("staff");
  const password = String(fd.get("password") ?? ""); if (password.length < 8) return go("Password needs to be at least 8 characters.", true);
  await db.update(s.users).set({ passwordHash: await bcrypt.hash(password, 12) }).where(eq(s.users.id, id));
  return go("Password updated.");
}

export async function removeStaff(id: string) {
  const u = await requireStaff("staff");
  if (id === u.uid) return go("You can't remove your own account while logged in as them.", true);
  const [target] = await db.select({ role: s.users.role, name: s.users.name }).from(s.users).where(eq(s.users.id, id));
  if (!target) return go("Not found.", true);
  if (target.role === "SUPER_ADMIN") { const [{ n }] = await db.select({ n: s.users.id }).from(s.users).where(and(eq(s.users.role, "SUPER_ADMIN"), ne(s.users.id, id))).then((r) => [{ n: r.length }]);
    if (n === 0) return go("This is the last owner account — give owner access to someone else before removing it.", true); }
  await db.delete(s.users).where(eq(s.users.id, id));
  revalidatePath("/admin/staff"); return go(`${target.name} removed.`);
}
