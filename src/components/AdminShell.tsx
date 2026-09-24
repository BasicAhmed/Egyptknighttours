"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const I = (d: string) => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>;
const ICON = {
  orders: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z",
  inquiries: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  tours: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  itineraries: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  reports: "M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z",
  referrals: "M8 6a4 4 0 118 0 4 4 0 01-8 0zm-6 14c0-3.31 3.58-6 8-6a8.7 8.7 0 013.35.67 5.5 5.5 0 005.16 7.33H2v-2zm18.5-3c1.93 0 3.5 1.57 3.5 3.5S22.43 24 20.5 24 17 22.43 17 20.5 18.57 17 20.5 17zm-1 2v1.5h-1.25a.75.75 0 000 1.5h1.25V22h1.5v-1h1.25a.75.75 0 000-1.5H21v-1.5h-1.5z",
  staff: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  finance: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
};
const NAV = [["Orders", "/admin", "orders"], ["Inquiries", "/admin/leads", "inquiries"], ["Tours", "/admin/tours", "tours"], ["Itineraries", "/admin/itineraries", "itineraries"], ["Reports", "/admin/reports", "reports"], ["Finance", "/admin/finance", "finance"], ["Referrals", "/admin/referrals", "referrals"], ["Staff", "/admin/staff", "staff"], ["Settings", "/admin/settings", "settings"]] as const;

export default function AdminShell({ user, logout, credit, creditLight, badges = {}, children }: { user: { name: string; role: string }; logout: () => Promise<void>; credit?: React.ReactNode; creditLight?: React.ReactNode; badges?: Record<string, number>; children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const items = NAV.filter(([, , k]) => {
    if (k === "staff") return user.role === "SUPER_ADMIN";
    return (k !== "settings" && k !== "finance" && k !== "referrals") || ["SUPER_ADMIN", "MANAGER"].includes(user.role);
  });
  const badge = (h: string, cls: string) => (badges[h] ? <span className={cls}><span aria-hidden="true">{badges[h] > 99 ? "99+" : badges[h]}</span><span className="sr-only"> {badges[h]} waiting</span></span> : null);
  const on = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  return (
    <div className="min-h-screen bg-[#F5F4F0] md:pl-60">
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:font-semibold focus:text-white">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink/[.08] bg-white shadow-[1px_0_0_rgba(20,16,16,.02)] md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-ink/10 px-4"><Image src="/logo.webp" alt="" width={56} height={42} className="h-9 w-auto" /><div className="leading-tight"><p className="font-display text-[15px] font-extrabold">Egypt Knight</p><p className="text-[11px] text-ink/65">Staff panel</p></div></div>
        <nav aria-label="Admin" className="flex-1 space-y-0.5 p-3">{items.map(([l, h, k]) => <Link key={h} href={h} aria-current={on(h) ? "page" : undefined} className={`flex items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-[15px] font-semibold transition-colors ${on(h) ? "border-gold-600 bg-gold-500/[.14] text-ink" : "border-transparent text-ink/65 hover:bg-ink/[.04] hover:text-ink"}`}>{I(ICON[k])}{l}{badge(h, "ml-auto rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white")}</Link>)}</nav>
        <div className="border-t border-ink/10 p-3">{credit && <div className="mb-2 rounded-xl bg-ink px-3 py-2 text-[11px] leading-snug text-white/70">{credit}</div>}<p className="truncate px-2 text-sm font-semibold">{user.name}</p><p className="px-2 text-xs text-ink/65">{user.role.replace("_", " ").toLowerCase()}</p>
          <div className="mt-2 flex gap-2"><a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-outline !min-h-[38px] !flex-1 !py-1.5 !text-[13px]">View site</a><form action={logout}><button className="btn btn-outline !min-h-[38px] !py-1.5 !text-[13px]">Log out</button></form></div></div>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink/10 bg-white px-4 md:hidden">
        <Link href="/admin" className="flex items-center gap-2"><Image src="/logo.webp" alt="" width={48} height={36} className="h-8 w-auto" /><span className="font-display text-[15px] font-extrabold">Staff panel</span></Link>
        <form action={logout}><button className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm font-semibold">Log out</button></form>
      </header>
      <div id="admin-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 outline-none md:px-8 md:pb-12 md:pt-8">{children}<div className="mt-12 text-center text-xs text-ink/65 md:hidden">{creditLight ?? credit}</div></div>
      <nav aria-label="Admin (mobile)" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-ink/10 bg-white md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {items.map(([l, h, k]) => <Link key={h} href={h} aria-current={on(h) ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold ${on(h) ? "text-ink" : "text-ink/65"}`}><span className={`relative flex h-7 w-11 items-center justify-center rounded-full ${on(h) ? "bg-gold-500" : ""}`}>{I(ICON[k])}{badge(h, "absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-ink px-1 text-center text-[10px] font-bold leading-[18px] text-white")}</span>{l}</Link>)}
      </nav>
    </div>
  );
}
