"use client";
import { usePathname } from "next/navigation";
// Hides the public website header/footer on admin pages.
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  return p?.startsWith("/admin") ? null : <>{children}</>;
}
