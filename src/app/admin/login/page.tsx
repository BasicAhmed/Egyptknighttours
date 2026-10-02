import { db, schema as s } from "../../../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import Image from "next/image";
import BuilderCredit from "../../../components/BuilderCredit";
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
  return (
    <div className="flex min-h-screen flex-col bg-ink md:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden px-6 pb-8 pt-10 text-white md:w-[46%] md:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/25 blur-3xl md:h-[28rem] md:w-[28rem]" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white"><Image src="/logo.webp" alt="Egypt Knight" width={90} height={68} className="h-10 w-auto" priority /></span>
        <div className="relative mt-8 md:mt-0"><p className="font-display text-[34px] font-extrabold leading-[1.05] tracking-tight md:text-[52px]">Every trip,<br />from first message<br />to last day.</p><p className="mt-4 max-w-sm text-[15px] text-white/60">Orders, itineraries, invoices and payments for the Egypt Knight team.</p><div className="mt-8 hidden text-xs text-white/45 md:block"><BuilderCredit prefix="Website & booking system by" /></div></div>
      </div>
      <div className="flex flex-1 items-start justify-center rounded-t-[28px] bg-[#EFEDE7] px-5 pb-10 pt-8 md:items-center md:rounded-l-[36px] md:rounded-tr-none md:p-14">
        <form action={login} className="w-full max-w-sm space-y-4"><h1 className="font-display text-[28px] font-extrabold leading-tight">Staff login</h1>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="input !border-transparent" /></div>
          <div><label className="label" htmlFor="pw">Password</label><input id="pw" name="password" type="password" required autoComplete="current-password" className="input !border-transparent" /></div>
          {e && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{e === "rate" ? "Too many attempts. Wait a few minutes, then try again." : "That email or password isn't right."}</p>}
          <button className="btn btn-dark w-full">Log in</button><div className="pt-6 text-center text-xs text-ink/55 md:hidden"><BuilderCredit prefix="Website & booking system by" dark={false} /></div></form>
      </div>
    </div>
  );
}
