"use client";
// The "New order" alert in the staff panel. Built to be impossible to miss and easy to read:
//  - opening the panel with unseen new orders shows a large window listing them (big text, strong contrast, big buttons);
//  - "Later" folds it into a large banner at the top of every page until the orders are seen;
//  - a new order arriving while the panel is open brings the window back (or the banner, if you are typing), plays a short
//    chime, puts the count in the browser tab's title and, if allowed, shows a desktop notification;
//  - an order counts as seen once you open it, or press "Got it". Each staff member has their own list.
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Modal from "./Modal";
import { ordersSeen } from "@/app/admin/alert-actions";
import { SOURCE_LABEL, ago } from "./order-ui";
import type { NewOrder, NewOrders } from "@/lib/order-alerts";

const POLL_SECONDS = 30;
const TITLE_RE = /^\(\d+\+?\) New orders? · /;
const SOUND_KEY = "ek.newOrderSound";
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private window: setting is just not remembered */ } } };

const Bell = ({ size = 28 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22zm7-6V11a7 7 0 00-5.5-6.84V3a1.5 1.5 0 00-3 0v1.16A7 7 0 005 11v5l-2 2v1h18v-1l-2-2z" /></svg>;
const travel = (iso: string) => (iso ? new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "No date");
const plural = (n: number) => `${n} new order${n === 1 ? "" : "s"}`;

// A short, friendly two-note chime made in the browser (no sound file to load). Browsers only allow it after the page has
// been clicked or tapped once, so the first alert on a fresh page may be silent; the window and the tab title still show.
function chime() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = new AC();
    [[880, 0], [1320, 0.18]].forEach(([f, at]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at); g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.45);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.5);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch { /* sound is a bonus only */ }
}
const busy = () => { const a = document.activeElement; return /^(INPUT|TEXTAREA|SELECT)$/.test(a?.tagName ?? "") || (a as HTMLElement | null)?.isContentEditable || !!document.querySelector("[role=dialog]"); };

export default function NewOrderAlert({ initial }: { initial: NewOrders }) {
  const router = useRouter(); const path = usePathname() ?? "";
  const [data, setData] = useState<NewOrders>(initial);
  const [open, setOpen] = useState(initial.orders.length > 0); // shown straight away when the panel is opened with new orders
  const [sound, setSound] = useState(true);
  const [notifyState, setNotifyState] = useState<NotificationPermission | "unsupported">("unsupported");
  const [announce, setAnnounce] = useState("");
  // "Arrived" means received after the newest order already on screen: older ones that simply were not in the list yet
  // (more than 20 waiting) are shown without a chime.
  const newest = useRef(Math.max(0, ...initial.orders.map((o) => o.createdAt)));
  const hidden = useRef(new Set<string>()); // seen in this tab; kept out even if the server answers before it has saved them

  useEffect(() => {
    if (document.querySelector("[role=dialog]")) setOpen(false); // the page opened straight onto an order: show the banner, not a window over it
    setSound(store.get(SOUND_KEY) !== "off");
    setNotifyState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const visible = data.orders.filter((o) => !hidden.current.has(o.id));
  const count = Math.max(0, data.count - (data.orders.length - visible.length));

  // The browser tab shows the count too, so a new order is noticed from another tab or window.
  useEffect(() => {
    const apply = () => { const base = document.title.replace(TITLE_RE, ""); document.title = count ? `(${count > 99 ? "99+" : count}) ${count === 1 ? "New order" : "New orders"} · ${base}` : base; };
    apply(); const t = setTimeout(apply, 400); // page titles change after navigating: put the count back
    return () => clearTimeout(t);
  }, [count, path]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/new-orders", { cache: "no-store" });
      if (!res.ok) return;
      const next = (await res.json()) as NewOrders;
      const arrived = next.orders.filter((o) => o.createdAt > newest.current && !hidden.current.has(o.id));
      newest.current = Math.max(newest.current, ...next.orders.map((o) => o.createdAt));
      setData(next);
      if (!arrived.length) return;
      setAnnounce(`${plural(arrived.length)}: ${arrived.map((o) => o.name).join(", ")}`);
      if (store.get(SOUND_KEY) !== "off") chime();
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
        try { const n = new Notification(arrived.length === 1 ? `New order: ${arrived[0].name}` : plural(arrived.length), { body: arrived.map((o) => `${o.name} · ${o.title}`).join("\n"), tag: "ek-new-order", icon: "/icons/icon-192.png" }); n.onclick = () => { window.focus(); setOpen(true); n.close(); }; } catch { /* some browsers only allow this from a service worker */ }
      }
      if (!busy()) setOpen(true); // never pop up over a form someone is filling in: the banner shows instead
    } catch { /* offline for a moment: try again next time */ }
  }, []);

  useEffect(() => { const id = setInterval(poll, POLL_SECONDS * 1000); const back = () => { if (document.visibilityState === "visible") poll(); }; document.addEventListener("visibilitychange", back); return () => { clearInterval(id); document.removeEventListener("visibilitychange", back); }; }, [poll]);

  // Opening an order anywhere in the panel (the Orders list, the calendar) marks it seen; the order window tells us here.
  useEffect(() => {
    const onSeen = (e: Event) => { const ids = (e as CustomEvent<string[]>).detail ?? []; ids.forEach((i) => hidden.current.add(i)); setData((d) => ({ ...d })); };
    window.addEventListener("ek:orders-seen", onSeen); return () => window.removeEventListener("ek:orders-seen", onSeen);
  }, []);
  useEffect(() => { if (open && !visible.length) setOpen(false); }, [open, visible.length]);

  const seen = (ids: string[]) => { ids.forEach((i) => hidden.current.add(i)); setData((d) => ({ ...d })); void ordersSeen(ids).then(poll); }; // then fetch any still waiting beyond the first 20
  const openOrder = (o: NewOrder) => { seen([o.id]); setOpen(false); router.push(`/admin?open=${encodeURIComponent(o.id)}`); };
  const toggleSound = () => { const v = !sound; setSound(v); store.set(SOUND_KEY, v ? "on" : "off"); if (v) chime(); };
  const askNotify = async () => { try { setNotifyState(await Notification.requestPermission()); } catch { /* not supported */ } };

  if (!visible.length) return null;
  const more = count - visible.length;

  return (
    <>
      <p className="sr-only" aria-live="assertive">{announce}</p>
      {/* The banner: on every page until the new orders are seen. Large, dark and gold, with words and an icon, never colour alone. */}
      {!open && (
        <div role="status" className="sticky top-14 z-20 -mx-4 mb-5 md:top-0 md:mx-0">
          <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-4 bg-ink px-5 py-4 text-left text-white shadow-[0_14px_34px_-14px_rgba(20,16,16,.7)] ring-4 ring-gold-500 md:rounded-2xl">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink"><Bell /><span aria-hidden="true" className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-600 ring-2 ring-ink motion-safe:animate-ping" /></span>
            <span className="min-w-0 flex-1"><span className="block font-display text-[22px] font-extrabold leading-tight text-gold-500 sm:text-[26px]">{plural(count)} waiting</span>
              <span className="block truncate text-[17px] text-white/90">{visible.slice(0, 3).map((o) => o.name).join(", ")}{count > 3 ? ` and ${count - 3} more` : ""}</span></span>
            <span className="hidden shrink-0 rounded-xl bg-gold-500 px-5 py-3 text-[17px] font-bold text-ink sm:block">Show</span>
          </button>
        </div>
      )}

      {open && (
        <Modal alert title={<span className="flex items-center gap-3"><Bell size={34} />{plural(count)}</span>} subtitle={count === 1 ? "A customer is waiting for your reply." : "Customers are waiting for your reply."} onClose={() => setOpen(false)}>
          <ul className="space-y-3">
            {visible.map((o) => (
              <li key={o.id} className="rounded-2xl border-2 border-ink/15 p-4 sm:p-5">
                <p className="font-display text-[24px] font-extrabold leading-tight text-ink sm:text-[26px]">{o.name || "New customer"}</p>
                <p className="mt-1 text-[19px] font-semibold text-ink/90">{o.title}</p>
                <dl className="mt-2 grid gap-x-6 gap-y-1 text-[17px] text-ink sm:grid-cols-2">
                  <div><dt className="inline font-semibold">Travel date: </dt><dd className="inline">{travel(o.travelDate)}</dd></div>
                  <div><dt className="inline font-semibold">People: </dt><dd className="inline">{o.pax}</dd></div>
                  <div><dt className="inline font-semibold">Came from: </dt><dd className="inline">{SOURCE_LABEL[o.source] ?? o.source}{o.country ? ` · ${o.country}` : ""}</dd></div>
                  <div><dt className="inline font-semibold">Received: </dt><dd className="inline">{ago(o.createdAt)}</dd></div>
                </dl>
                <button type="button" onClick={() => openOrder(o)} className="btn btn-primary mt-3 w-full !min-h-[56px] !text-[18px] sm:w-auto sm:!px-8">Open order {o.ref}</button>
              </li>
            ))}
          </ul>
          {more > 0 && <p className="mt-3 text-[17px] text-ink">And {more} more in the Orders list, under "To do".</p>}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => { seen(visible.map((o) => o.id)); setOpen(false); }} className="btn btn-dark !min-h-[56px] !text-[18px]">Got it, I've seen {count === 1 ? "it" : "them"}</button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline !min-h-[56px] !text-[18px]">Later (keep the reminder)</button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/10 pt-4 text-[16px]">
            <button type="button" onClick={toggleSound} aria-pressed={sound} className="font-semibold text-ink underline underline-offset-4">Sound for new orders: {sound ? "On" : "Off"}</button>
            {notifyState === "default" && <button type="button" onClick={askNotify} className="font-semibold text-ink underline underline-offset-4">Also alert me when this tab is in the background</button>}
            {notifyState === "denied" && <span className="text-ink/70">Desktop alerts are blocked in this browser's settings.</span>}
          </div>
        </Modal>
      )}
    </>
  );
}
