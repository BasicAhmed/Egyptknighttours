import { headers } from "next/headers";
import { SITE } from "./format";

// Links sent to customers and guides (tracker, guide sheet, documents, emails) must always open the real, live site —
// egyptknight.com — never a Vercel preview/deployment address, even if that's what someone happens to be browsing the
// admin from (an old bookmark, a Vercel dashboard preview link, etc). Only the site's own address and localhost are
// accepted; a forged Host header, or a stray .vercel.app visit, can never put the wrong address into a customer email.
export function pickOrigin(hostHeader: string | null | undefined, proto: string | null | undefined, site: string): string {
  const host = (hostHeader ?? "").split(",")[0].trim().toLowerCase(); if (!host || /[\s/@]/.test(host)) return site;
  const bare = host.replace(/:\d+$/, "").replace(/^www\./, "");
  let own = ""; try { own = new URL(site).hostname.replace(/^www\./, "").toLowerCase(); } catch { /* no site set */ }
  const local = bare === "localhost" || bare === "127.0.0.1";
  if (!(bare === own || local)) return site;
  // Public addresses are always https. Only localhost may use http (for local testing).
  const p = (proto ?? "").split(",")[0].trim().toLowerCase(); return `${local ? (p === "https" ? "https" : "http") : "https"}://${host}`;
}
export async function linkOrigin(): Promise<string> {
  try { const h = await headers(); return pickOrigin(h.get("host"), h.get("x-forwarded-proto"), SITE); } catch { return SITE; }
}
