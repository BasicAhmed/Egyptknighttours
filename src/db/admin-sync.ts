import { db, schema as s, client } from "./index";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";

// ADMIN_EMAIL / ADMIN_PASSWORD are the source of truth for the main admin account.
// A keyed fingerprint of the two is stored, so a normal start does no password hashing at all: work only happens when they change.
export const adminFingerprint = () => {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(); const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!email || password.length < 8) return null;
  return createHmac("sha256", process.env.AUTH_SECRET ?? "x").update(`${email}\0${password}`).digest("hex").slice(0, 32);
};
export async function syncAdminFromEnv(previous?: string) {
  const fp = adminFingerprint(); if (!fp) return { status: "skipped" as const };
  if (previous === fp) return { status: "ok" as const };
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(); const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  const [u] = await db.select().from(s.users).where(eq(s.users.email, email)); let status: "created" | "updated" | "ok" = "ok";
  if (!u) { await db.insert(s.users).values({ email, name: "Admin", passwordHash: await bcrypt.hash(password, 12), role: "SUPER_ADMIN" }); status = "created"; }
  else if (!(await bcrypt.compare(password, u.passwordHash))) { await db.update(s.users).set({ passwordHash: await bcrypt.hash(password, 12) }).where(eq(s.users.id, u.id)); status = "updated"; }
  await client.execute({ sql: "insert into settings(key,value) values('admin.envhash',?) on conflict(key) do update set value=excluded.value", args: [fp] });
  return { status };
}
