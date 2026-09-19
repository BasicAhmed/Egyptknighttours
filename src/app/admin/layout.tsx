import type { Metadata } from "next";
import Link from "next/link";
import { getSession, destroySession } from "../../lib/auth";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
async function logout() { "use server"; await destroySession(); redirect("/admin/login"); }
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  return <div className="container-x py-6">
    {s && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3">
      <nav aria-label="Admin" className="flex flex-wrap gap-4 text-sm font-semibold">{[["Dashboard", "/admin"], ["Tours", "/admin/tours"], ["Bookings", "/admin/bookings"], ["Leads", "/admin/leads"]].map(([l, h]) => <Link key={h} href={h} className="hover:text-gold-700">{l}</Link>)}</nav>
      <form action={logout} className="flex items-center gap-3 text-sm"><span className="text-ink/60">{s.name} · {s.role}</span><button className="btn btn-outline !py-1.5">Log out</button></form></div>}
    {children}</div>;
}
