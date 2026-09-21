import dns from "node:dns/promises";
import net from "node:net";

// Photos can only be pulled from the website you name (for example your old site), over https, and never from private networks.
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) { const [a, b] = ip.split(".").map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224; }
  if (net.isIPv6(ip)) { const x = ip.toLowerCase(); return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || (x.startsWith("::ffff:") && isPrivateIp(x.slice(7))); }
  return true;
}
const bare = (h: string) => h.replace(/^www\./, "").toLowerCase();
export function checkImageUrl(raw: string, allowedHosts: string[]): URL | null {
  let u: URL; try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  const h = bare(u.hostname); const ok = allowedHosts.map(bare).filter(Boolean).some((a) => h === a || h.endsWith("." + a));
  return ok ? u : null;
}
export async function downloadImage(raw: string, allowedHosts: string[], maxBytes = 6_000_000): Promise<Buffer> {
  let url = checkImageUrl(raw, allowedHosts); if (!url) throw new Error("not from an allowed https website");
  for (let hop = 0; hop < 4; hop++) {
    const addrs = await dns.lookup(url.hostname, { all: true }); if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("address is not public");
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "user-agent": "TourSystem-Importer/1.0" } });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { const next = checkImageUrl(new URL(r.headers.get("location")!, url).toString(), allowedHosts); if (!next) throw new Error("redirected to a website that is not allowed"); url = next; continue; }
    if (!r.ok) throw new Error(`the website answered ${r.status}`);
    const len = Number(r.headers.get("content-length") ?? 0); if (len > maxBytes) throw new Error("file too large");
    const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > maxBytes) throw new Error("file too large"); return buf;
  }
  throw new Error("too many redirects");
}
