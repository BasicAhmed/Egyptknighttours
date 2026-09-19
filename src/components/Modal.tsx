"use client";
import { useEffect, useRef } from "react";

// Full-screen sheet on phones, centered dialog on larger screens. Esc and backdrop click close it.
export default function Modal({ title, subtitle, onClose, children, wide = false }: { title: React.ReactNode; subtitle?: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k); ref.current?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", k); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Details"} className={`flex max-h-full w-full flex-col overflow-hidden bg-white shadow-2xl outline-none sm:max-h-[92vh] sm:rounded-2xl ${wide ? "sm:max-w-4xl" : "sm:max-w-2xl"} h-full sm:h-auto`}>
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-4 py-3 sm:px-6">
          <div className="min-w-0"><div className="font-display text-lg font-extrabold leading-tight sm:text-xl">{title}</div>{subtitle && <div className="mt-0.5 text-sm text-ink/60">{subtitle}</div>}</div>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/15 text-xl hover:bg-ink/5">×</button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
