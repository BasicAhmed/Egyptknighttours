import type { Metadata } from "next";
import { getSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import BuilderCredit from "@/components/BuilderCredit";
export const metadata: Metadata = { title: "Staff panel", robots: { index: false, follow: false } };
async function logout() { "use server"; await destroySession(); redirect("/admin/login"); }
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  const credit = <BuilderCredit prefix="Built by" dark={false} />;
  if (!s) return <div className="min-h-screen bg-[#F5F4F0] px-4">{children}<div className="pb-8 text-center text-xs text-ink/65"><BuilderCredit prefix="Website & booking system by" dark={false} /></div></div>;
  return <AdminShell user={{ name: s.name, role: s.role }} logout={logout} credit={<BuilderCredit prefix="Built by" />}>{children}</AdminShell>;
}
