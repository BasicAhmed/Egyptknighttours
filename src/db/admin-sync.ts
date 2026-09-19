import { db, schema as s } from "./index";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// The ADMIN_EMAIL / ADMIN_PASSWORD settings are the source of truth for the main admin account.
// On every start: create the account if it's missing, and update the password if the setting changed.
export async function syncAdminFromEnv() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!email || password.length < 8) return { status: "skipped" as const };
  const [u] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (!u) { await db.insert(s.users).values({ email, name: "Admin", passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN" }); return { status: "created" as const }; }
  if (!(await bcrypt.compare(password, u.passwordHash))) { await db.update(s.users).set({ passwordHash: await bcrypt.hash(password, 12) }).where(eq(s.users.id, u.id)); return { status: "updated" as const }; }
  return { status: "ok" as const };
}
