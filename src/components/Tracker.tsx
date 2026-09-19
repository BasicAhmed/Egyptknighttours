"use client";
import { useEffect } from "react";
function sid() {
  try { let v = sessionStorage.getItem("egk_sid"); if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("egk_sid", v); } return v; } catch { return undefined; }
}
export function track(name: string, extra: { tourSlug?: string; props?: Record<string, string | number | boolean> } = {}) {
  try { fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ name, sessionId: sid(), path: location.pathname, ...extra }) }); } catch {}
}
export default function Tracker({ name, tourSlug }: { name: string; tourSlug?: string }) {
  useEffect(() => { track(name, { tourSlug }); }, [name, tourSlug]);
  return null;
}
