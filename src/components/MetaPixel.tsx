"use client";
// Meta Pixel with the visitor's consent. Nothing from Meta is loaded until they press Accept; "No thanks" keeps it off.
// The choice is remembered in this browser and can be changed from "Cookie settings" in the footer. Page views are sent
// on every page change (the site changes pages without a full reload) except on private pages.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, CONSENT_KEY, CONSENT_EVENT, pixelAllowedPath } from "@/lib/meta-pixel";

type Fbq = ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[][]; push?: unknown; loaded?: boolean; version?: string };
const read = () => { try { return localStorage.getItem(CONSENT_KEY); } catch { return null; } };
const write = (v: "yes" | "no") => { try { localStorage.setItem(CONSENT_KEY, v); } catch { /* private window: asked again next visit */ } };

// Meta's standard loader, as given in their pixel code, written out so it runs only after consent.
function loadPixel() {
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) { w.fbq("consent", "grant"); return; }
  const n = function (...args: unknown[]) { if (n.callMethod) n.callMethod(...args); else n.queue.push(args); } as Fbq;
  n.queue = []; n.push = n; n.loaded = true; n.version = "2.0"; w.fbq = n; if (!w._fbq) w._fbq = n;
  const s = document.createElement("script"); s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(s);
  n("init", META_PIXEL_ID);
}

export default function MetaPixel() {
  const path = usePathname() ?? "/";
  const [choice, setChoice] = useState<string | null | undefined>(undefined); // undefined = not read yet (no flash of the banner)
  const [asking, setAsking] = useState(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => { const c = read(); setChoice(c); setAsking(c == null); }, []);
  useEffect(() => { const open = () => setAsking(true); window.addEventListener(CONSENT_EVENT, open); return () => window.removeEventListener(CONSENT_EVENT, open); }, []);

  // One page view per page shown, once accepted, on public pages only.
  useEffect(() => {
    if (choice !== "yes" || !pixelAllowedPath(path) || lastPath.current === path) return;
    loadPixel(); lastPath.current = path;
    (window as unknown as { fbq: Fbq }).fbq("track", "PageView");
  }, [choice, path]);

  const decide = (v: "yes" | "no") => {
    write(v); setChoice(v); setAsking(false);
    if (v === "no") { const f = (window as unknown as { fbq?: Fbq }).fbq; if (f) f("consent", "revoke"); lastPath.current = null; }
  };

  if (!asking || choice === undefined || !pixelAllowedPath(path)) return null;
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="ck-h" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl bg-ink p-4 text-white shadow-[0_18px_50px_rgba(20,16,16,.35)] print:hidden sm:p-5" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <p id="ck-h" className="font-display text-[17px] font-extrabold">Cookies</p>
      <p className="mt-1 text-[14.5px] leading-snug text-white/85">We'd like to use Meta (Facebook) cookies to see which of our ads bring visitors, and to show you relevant offers. The site works the same either way. <Link href="/privacy-policy" className="font-semibold text-gold-500 underline">Privacy policy</Link></p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => decide("yes")} className="btn btn-primary !min-h-[44px] flex-1 sm:flex-none">Accept</button>
        <button type="button" onClick={() => decide("no")} className="rounded-[10px] border border-white/30 px-5 py-2 text-[15px] font-semibold hover:bg-white/10 flex-1 sm:flex-none">No thanks</button>
      </div>
    </div>
  );
}
