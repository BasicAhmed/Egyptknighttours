"use client";
import { useEffect, useId, useRef } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
// Full-screen sheet on phones, centered dialog on larger screens. Esc and backdrop click close it.
// Keyboard focus stays inside while it is open and returns to what opened it, as screen readers expect.
// alert: an urgent message that needs attention (new order). Read out at once by screen readers, with a dark header and a large title.
export default function Modal({ title, subtitle, onClose, children, wide = false, alert = false }: { title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean; alert?: boolean }) {
  const ref = useRef<HTMLDivElement>(null); const titleId = useId(); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeRef.current(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!els.length) { e.preventDefault(); ref.current.focus(); return; }
      const first = els[0], last = els[els.length - 1], a = document.activeElement;
      if (!ref.current.contains(a) || (e.shiftKey && (a === first || a === ref.current))) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", k); ref.current?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", k); opener?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current(); }}>
      <div ref={ref} tabIndex={-1} role={alert ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={titleId} className={`flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl outline-none sm:max-h-[92vh] sm:rounded-2xl ${wide ? "sm:max-w-4xl" : "sm:max-w-2xl"} h-full sm:h-auto`}>
        <div className={`flex items-start justify-between gap-3 px-4 sm:px-6 ${alert ? "bg-ink py-5 text-white" : "border-b border-ink/10 py-3"}`}>
          <div className="min-w-0"><div id={titleId} className={`font-display font-extrabold leading-tight ${alert ? "text-[28px] text-gold-500 sm:text-[34px]" : "text-lg sm:text-xl"}`}>{title}</div>{subtitle && <div className={`mt-0.5 ${alert ? "text-lg text-white/85" : "text-sm text-ink/65"}`}>{subtitle}</div>}</div>
          <button onClick={() => closeRef.current()} aria-label="Close" className={`flex shrink-0 items-center justify-center rounded-full border text-xl ${alert ? "h-12 w-12 border-white/30 text-2xl text-white hover:bg-white/10" : "h-10 w-10 border-ink/15 hover:bg-ink/5"}`}>×</button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
