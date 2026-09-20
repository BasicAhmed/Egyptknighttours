import { db, schema as s } from "../../../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import Image from "next/image";
import { headers } from "next/headers";
import { createSession, getSession } from "../../../lib/auth";
import { loginSchema } from "../../../lib/validation";
import { rateLimitPersistent, clientIp } from "../../../lib/rate-limit";

const DUMMY = "$2a$12$C6UzMDM.H6dfI/f/IKcXeOe5Yb1uFqRk7K0m0jY7xXGm7cQkqk1a2";
async function login(fd: FormData) {
  "use server";
  const ip = clientIp(await headers());
  if (!(await rateLimitPersistent("login:" + ip, 8, 15 * 60_000))) redirect("/admin/login?e=rate");
  const p = loginSchema.safeParse({ email: String(fd.get("email") ?? "").trim(), password: fd.get("password") });
  if (!p.success) redirect("/admin/login?e=bad");
  const [u] = await db.select().from(s.users).where(eq(s.users.email, p.data.email.toLowerCase()));
  const ok = await bcrypt.compare(p.data.password, u?.passwordHash ?? DUMMY);
  if (!u || !ok) redirect("/admin/login?e=bad");
  await createSession({ uid: u.id, email: u.email, name: u.name, role: u.role });
  await db.insert(s.auditLogs).values({ userId: u.id, action: "LOGIN", entity: "user", entityId: u.id });
  redirect("/admin");
}
export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await getSession()) redirect("/admin");
  const { e } = await searchParams;
  return <form action={login} className="mx-auto mt-[12vh] max-w-sm space-y-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm"><Image src="/logo.webp" alt="Egypt Knight" width={90} height={68} className="mx-auto h-14 w-auto" priority /><h1 className="text-center font-display text-2xl font-extrabold">Staff login</h1>
    <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="input" /></div>
    <div><label className="label" htmlFor="pw">Password</label><input id="pw" name="password" type="password" required autoComplete="current-password" className="input" /></div>
    {e && <p role="alert" className="text-sm text-red-700">{e === "rate" ? "Too many attempts. Wait a few minutes." : "Wrong email or password."}</p>}
    <button className="btn btn-dark w-full">Log in</button></form>;
}
