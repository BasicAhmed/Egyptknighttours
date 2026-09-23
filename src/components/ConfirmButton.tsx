"use client";
// A submit button that asks for confirmation first. Used inside a <form action={...}> whose action should only run if the person confirms.
export default function ConfirmButton({ children, confirmText, className = "text-sm font-semibold text-red-700 underline" }: { children: React.ReactNode; confirmText: string; className?: string }) {
  return <button className={className} onClick={(e) => { if (!window.confirm(confirmText)) e.preventDefault(); }}>{children}</button>;
}
