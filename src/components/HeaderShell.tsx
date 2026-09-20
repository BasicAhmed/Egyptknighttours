"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// On the homepage the header floats over the hero so the ambient gradient runs behind it.
// The header is always transparent. When content scrolls underneath it, a light blur keeps the menu readable (no white fill).
export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const home = usePathname() === "/"; const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!home) return; const on = () => setScrolled(window.scrollY > 12); on();
    window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on);
  }, [home]);
  const cls = home
    ? `fixed inset-x-0 top-0 z-40 bg-transparent transition-[backdrop-filter] duration-300 ${scrolled ? "backdrop-blur-lg" : ""}`
    : "sticky top-0 z-40 bg-transparent backdrop-blur-lg";
  return <header className={cls}>{children}</header>;
}
