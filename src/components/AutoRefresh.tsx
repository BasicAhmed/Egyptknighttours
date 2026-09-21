"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// New bookings and inquiries appear by themselves. It never refreshes while a window is open or while someone is typing.
export default function AutoRefresh({ seconds = 45 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      const tag = document.activeElement?.tagName ?? "";
      if (document.visibilityState !== "visible" || document.querySelector("[role=dialog]") || /^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
