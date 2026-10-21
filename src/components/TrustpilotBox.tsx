"use client";
// Trustpilot "Review us" box (TrustBox Review Collector). Trustpilot's script draws it from the data attributes; the plain
// link inside is what shows if the script can't load. Loaded once, and re-drawn when the site changes page without a reload.
import { useEffect, useRef } from "react";

const SRC = "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js";
type TP = { loadFromElement: (el: HTMLElement, force?: boolean) => void };

export default function TrustpilotBox({ businessId, url, className = "" }: { businessId: string; url: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const draw = () => { const tp = (window as unknown as { Trustpilot?: TP }).Trustpilot; if (tp && ref.current) tp.loadFromElement(ref.current, true); };
    if ((window as unknown as { Trustpilot?: TP }).Trustpilot) { draw(); return; }
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (!s) { s = document.createElement("script"); s.src = SRC; s.async = true; document.head.appendChild(s); }
    s.addEventListener("load", draw); return () => s?.removeEventListener("load", draw);
  }, [businessId]);
  if (!businessId || !url) return null;
  return (
    <div ref={ref} className={`trustpilot-widget ${className}`} data-locale="en-US" data-template-id="56278e9abfbbba0bdcd568bc" data-businessunit-id={businessId} data-style-height="52px" data-style-width="100%">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold underline">Review us on Trustpilot</a>
    </div>
  );
}
