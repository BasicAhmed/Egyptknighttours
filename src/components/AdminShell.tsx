"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const I = (d: string) => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>;
const ICON = {
  orders: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z",
  inquiries: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  tours: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  itineraries: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  reports: "M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z",
  referrals: "M8 6a4 4 0 118 0 4 4 0 01-8 0zm-6 14c0-3.31 3.58-6 8-6a8.7 8.7 0 013.35.67 5.5 5.5 0 005.16 7.33H2v-2zm18.5-3c1.93 0 3.5 1.57 3.5 3.5S22.43 24 20.5 24 17 22.43 17 20.5 18.57 17 20.5 17zm-1 2v1.5h-1.25a.75.75 0 000 1.5h1.25V22h1.5v-1h1.25a.75.75 0 000-1.5H21v-1.5h-1.5z",
  corporate: "M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z",
  staff: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  finance: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  calendar: "M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10zM7 12h5v5H7v-5z",
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
};
const NAV = [["Orders", "/admin", "orders"], ["Inquiries", "/admin/leads", "inquiries"], ["Tours", "/admin/tours", "tours"], ["Itineraries", "/admin/itineraries", "itineraries"], ["Calendar", "/admin/calendar", "calendar"], ["Reports", "/admin/reports", "reports"], ["Finance", "/admin/finance", "finance"], ["Referrals", "/admin/referrals", "referrals"], ["Corporate", "/admin/corporate", "corporate"], ["Staff", "/admin/staff", "staff"], ["Settings", "/admin/settings", "settings"]] as const;
// The desktop menu is grouped by what staff are doing, so the daily work sits apart from the occasional admin.
const GROUPS: [string, string[]][] = [["Daily work", ["orders", "calendar", "inquiries", "corporate"]], ["What you sell", ["tours", "itineraries"]], ["Business", ["reports", "finance", "referrals"]], ["Admin", ["staff", "settings"]]];

export default function AdminShell({ user, logout, credit, creditLight, badges = {}, children }: { user: { name: string; role: string }; logout: () => Promise<void>; credit?: React.ReactNode; creditLight?: React.ReactNode; badges?: Record<string, number>; children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false); const [meOpen, setMeOpen] = useState(false);
  useEffect(() => { setMoreOpen(false); setMeOpen(false); }, [path]);
  const items = NAV.filter(([, , k]) => {
    if (k === "staff") return user.role === "SUPER_ADMIN";
    if (k === "corporate") return ["SUPER_ADMIN", "MANAGER", "SALES", "TOUR_OPERATOR"].includes(user.role);
    return (k !== "settings" && k !== "finance" && k !== "referrals") || ["SUPER_ADMIN", "MANAGER"].includes(user.role);
  });
  const badge = (h: string, cls: string) => (badges[h] ? <span className={cls}><span aria-hidden="true">{badges[h] > 99 ? "99+" : badges[h]}</span><span className="sr-only"> {badges[h]} waiting</span></span> : null);
  const on = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const role = user.role.replace("_", " ").toLowerCase();
  const Avatar = ({ cls = "" }: { cls?: string }) => <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-gold-500 font-display font-extrabold text-ink ${cls}`}>{initials}</span>;
  return (
    <div className="adm min-h-screen bg-[#EFEDE7] md:pl-[248px]">
      <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:font-semibold focus:text-white">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-ink text-white md:flex">
        <div className="flex h-[68px] items-center gap-3 px-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white"><Image src="/logo.webp" alt="" width={56} height={42} className="h-7 w-auto" /></span><div className="leading-tight"><p className="font-display text-[16px] font-extrabold">Egypt Knight</p><p className="text-[12px] text-white/55">Staff panel</p></div></div>
        <nav aria-label="Admin" className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
          {GROUPS.map(([g, keys]) => { const its = items.filter(([, , k]) => keys.includes(k)).sort((a, b) => keys.indexOf(a[2]) - keys.indexOf(b[2])); if (!its.length) return null; return (
            <div key={g} className="mt-4 first:mt-1"><p className="px-3 pb-1.5 text-[11.5px] font-semibold text-white/40">{g}</p>
              {its.map(([l, h, k]) => <Link key={h} href={h} aria-current={on(h) ? "page" : undefined} className={`relative mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14.5px] font-semibold transition-colors ${on(h) ? "bg-white/[.09] text-white" : "text-white/65 hover:bg-white/[.05] hover:text-white"}`}>{on(h) && <span aria-hidden="true" className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-gold-500" />}<span className={on(h) ? "text-gold-500" : ""}>{I(ICON[k])}</span>{l}{badge(h, "ml-auto rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-ink")}</Link>)}
            </div>); })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-1.5"><Avatar cls="h-9 w-9 text-[13px]" /><div className="min-w-0 leading-tight"><p className="truncate text-sm font-semibold">{user.name}</p><p className="text-xs capitalize text-white/55">{role}</p></div></div>
          <div className="mt-2 flex gap-2"><a href="/" target="_blank" rel="noopener noreferrer" className="flex-1 rounded-[10px] border border-white/15 px-3 py-2 text-center text-[13px] font-semibold text-white/85 hover:bg-white/[.06]">View site</a><form action={logout}><button className="rounded-[10px] border border-white/15 px-3 py-2 text-[13px] font-semibold text-white/85 hover:bg-white/[.06]">Log out</button></form></div>
          {credit && <div className="mt-3 px-2 text-[11px] leading-snug text-white/45">{credit}</div>}
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 text-white md:hidden">
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white"><Image src="/logo.webp" alt="" width={48} height={36} className="h-6 w-auto" /></span><span className="min-w-0 leading-tight"><span className="block truncate font-display text-[16px] font-extrabold">Egypt Knight</span><span className="block text-[11px] text-white/55">Staff panel</span></span></Link>
        <button type="button" aria-label="Your account" aria-expanded={meOpen} onClick={() => setMeOpen((v) => !v)} className="rounded-full p-0.5 ring-2 ring-white/15"><Avatar cls="h-8 w-8 text-[12px]" /></button>
      </header>
      {meOpen && <><button aria-label="Close account menu" onClick={() => setMeOpen(false)} className="fixed inset-0 z-40 bg-ink/40 md:hidden" />
        <div className="fixed right-3 top-[60px] z-50 w-60 rounded-2xl bg-white p-3 shadow-[0_18px_50px_rgba(20,16,16,.28)] md:hidden"><div className="flex items-center gap-3 px-1 pb-3"><Avatar cls="h-10 w-10 text-[14px]" /><div className="min-w-0 leading-tight"><p className="truncate font-semibold">{user.name}</p><p className="text-xs capitalize text-ink/60">{role}</p></div></div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full !min-h-[42px] !py-2 !text-sm">View website</a><form action={logout} className="mt-2"><button className="btn btn-dark w-full !min-h-[42px] !py-2 !text-sm">Log out</button></form></div></>}
      <div id="admin-content" tabIndex={-1} className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 outline-none md:px-9 md:pb-14 md:pt-9">{children}<div className="mt-12 text-center text-xs text-ink/55 md:hidden">{creditLight ?? credit}</div></div>
      {(() => {
        // Only as many items fit a phone row with readable labels; everything past that lives behind "More" instead of being crushed together.
        const PRIMARY = 4;
        const primary = items.slice(0, PRIMARY); const overflow = items.slice(PRIMARY);
        const overflowActive = overflow.some(([, h]) => on(h));
        const tab = (active: boolean) => `relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold ${active ? "text-white" : "text-white/55"}`;
        const bar = (active: boolean) => active ? <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-gold-500" /> : null;
        const NavIcon = ([l, h, k]: (typeof items)[number]) => <Link key={h} href={h} aria-current={on(h) ? "page" : undefined} className={tab(on(h))}>{bar(on(h))}<span className={`relative ${on(h) ? "text-gold-500" : ""}`}>{I(ICON[k])}{badge(h, "absolute -right-3 -top-1.5 min-w-[18px] rounded-full bg-gold-500 px-1 text-center text-[10px] font-bold leading-[18px] text-ink")}</span>{l}</Link>;
        return (
          <>
            {moreOpen && <button aria-label="Close menu" onClick={() => setMoreOpen(false)} className="fixed inset-0 z-30 bg-ink/40 md:hidden" />}
            {moreOpen && <nav aria-label="More sections" className="fixed inset-x-3 z-40 grid grid-cols-3 gap-1 rounded-2xl bg-ink p-2 shadow-[0_18px_50px_rgba(20,16,16,.35)] md:hidden" style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
              {overflow.map(([l, h, k]) => <Link key={h} href={h} aria-current={on(h) ? "page" : undefined} className={`flex flex-col items-center gap-1 rounded-xl py-3 text-[11.5px] font-semibold ${on(h) ? "bg-white/10 text-white" : "text-white/70"}`}><span className={on(h) ? "text-gold-500" : ""}>{I(ICON[k])}</span>{l}</Link>)}
            </nav>}
            <nav aria-label="Admin (mobile)" className="fixed inset-x-0 bottom-0 z-30 grid bg-ink md:hidden" style={{ gridTemplateColumns: `repeat(${primary.length + (overflow.length ? 1 : 0)}, minmax(0, 1fr))`, paddingBottom: "env(safe-area-inset-bottom)" }}>
              {primary.map((it) => NavIcon(it))}
              {overflow.length > 0 && <button type="button" aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen((v) => !v)} className={tab(moreOpen || overflowActive)}>{bar(moreOpen || overflowActive)}
                <span className={moreOpen || overflowActive ? "text-gold-500" : ""}>{I("M6 10a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z")}</span>More
              </button>}
            </nav>
          </>
        );
      })()}
    </div>
  );
}
