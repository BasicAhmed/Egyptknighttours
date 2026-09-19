"use client";
import { track } from "./Tracker";
export default function WhatsAppButton({ href, label, className = "btn btn-wa", tourSlug }: { href: string; label: string; className?: string; tourSlug?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => track("whatsapp_click", { tourSlug })}>{label}</a>;
}
