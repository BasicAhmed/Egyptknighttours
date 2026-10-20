"use client";
import { CONSENT_EVENT } from "@/lib/meta-pixel";
// Footer link that opens the cookie choice again, so a visitor can change their mind at any time.
export default function CookieSettingsLink() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_EVENT))} className="text-left hover:underline">Cookie settings</button>;
}
