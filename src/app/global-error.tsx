"use client";
import ErrorScreen from "@/components/ErrorScreen";
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><ErrorScreen {...props} /></body></html>;
}
