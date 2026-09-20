"use client";
import { useEffect } from "react";
export default function ConsoleBadge() {
  useEffect(() => {
    if ((window as unknown as { __nt?: boolean }).__nt) return; (window as unknown as { __nt?: boolean }).__nt = true;
    console.info("%c Nino Techy %c Website & booking system by Nino Techy ", "background:#F0B050;color:#141010;font-weight:800;padding:3px 6px;border-radius:4px 0 0 4px", "background:#141010;color:#F0B050;padding:3px 6px;border-radius:0 4px 4px 0");
  }, []);
  return null;
}
