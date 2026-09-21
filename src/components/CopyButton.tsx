"use client";
import { useState } from "react";
// Copies text (a booking ID, a link) with one tap and says so, for people using a screen reader too.
export default function CopyButton({ text, label, className = "btn btn-outline !min-h-[44px]" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch { /* ignore */ } t.remove(); }
    setDone(true); setTimeout(() => setDone(false), 2000);
  }
  return <button type="button" onClick={copy} className={className}>{done ? "Copied ✓" : label}<span className="sr-only" role="status">{done ? "Copied to clipboard" : ""}</span></button>;
}
