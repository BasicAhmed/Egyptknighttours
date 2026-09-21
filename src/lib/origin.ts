import { headers } from "next/headers";
import { SITE } from "./format";

// Links sent to customers and guides (tracker, guide sheet, documents, emails) must open the site the team is actually using.
// Before the domain is switched that is the Vercel address; afterwards it is the real domain. Only the site's own address,
// Vercel addresses and localhost are accepted, so a forged Host header can never put another website into an email.
export function pickOrigin(hostHeader: string | null | undefined, proto: string | null | undefined, site: string): string {
  const host = (hostHeader ?? "").split(",")[0].trim().toLowerCase(); if (!host || /[\s/@]/.test(host)) return site;
  const bare = host.replace(/:\d+$/, "").replace(/^www\./, "");
  let own = ""; try { own = new URL(site).hostname.replace(/^www\./, "").toLowerCase(); } catch { /* no site set */ }
  const local = bare === "localhost" || bare === "127.0.0.1";
  if (!(bare === own || bare.endsWith(".vercel.app") || local)) return site;
  // Public addresses are always https. Only localhost may use http (for local testing).
  const p = (proto ?? "").split(",")[0].trim().toLowerCase(); return `${local ? (p === "https" ? "https" : "http") : "https"}://${host}`;
}
export async function linkOrigin(): Promise<string> {
  try { const h = await headers(); return pickOrigin(h.get("host"), h.get("x-forwarded-proto"), SITE); } catch { return SITE; }
}
