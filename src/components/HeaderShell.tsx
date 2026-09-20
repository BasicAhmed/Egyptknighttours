"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// On the homepage the header floats over the hero so the ambient gradient runs behind it.
// It turns white as soon as you scroll. On every other page it is a normal sticky white header.
export default function HeaderShell({ children }: { children: React.ReactNode }) {
  const home = usePathname() === "/"; const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!home) return; const on = () => setScrolled(window.scrollY > 12); on();
    window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on);
  }, [home]);
  const cls = home
    ? `fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${scrolled ? "bg-white/90 backdrop-blur" : "bg-transparent"}`
    : "sticky top-0 z-40 bg-white/95 backdrop-blur";
  return <header className={cls}>{children}</header>;
}
