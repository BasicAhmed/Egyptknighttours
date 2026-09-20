// Fetch remote photos once, shrink to a print-friendly size and return data URIs the PDF can embed.
// Anything that fails to load is skipped so a broken image link never breaks the document.
import { db, schema as s } from "../db";
import { eq } from "drizzle-orm";

async function fromMedia(path: string): Promise<string | null> {
  const id = path.split("/").pop() ?? ""; const [m] = await db.select().from(s.media).where(eq(s.media.id, id)); if (!m) return null;
  try { const sharp = (await import("sharp")).default; const jpg = await sharp(Buffer.from(m.data)).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer(); return `data:image/jpeg;base64,${jpg.toString("base64")}`; }
  catch { return m.mime === "image/jpeg" || m.mime === "image/png" ? `data:${m.mime};base64,${Buffer.from(m.data).toString("base64")}` : null; }
}
export async function prepareImages(urls: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(urls.filter((u) => u.startsWith("/api/media/")).map(async (u) => { const d = await fromMedia(u).catch(() => null); if (d) out[u] = d; }));
  const uniq = [...new Set(urls.filter((u) => /^https?:\/\//i.test(u)))].slice(0, 40);
  await Promise.all(uniq.map(async (u) => {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(u, { signal: ctl.signal, redirect: "follow" }); clearTimeout(t);
      if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 15_000_000) return;
      const ct = (r.headers.get("content-type") ?? "").split(";")[0];
      try {
        // Shrink to a print-friendly size. If the image tool isn't available on the server, fall back to the original JPEG/PNG.
        const sharp = (await import("sharp")).default;
        const jpg = await sharp(buf).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
        out[u] = `data:image/jpeg;base64,${jpg.toString("base64")}`;
      } catch {
        if (ct === "image/jpeg" || ct === "image/png") out[u] = `data:${ct};base64,${buf.toString("base64")}`;
      }
    } catch { /* skip */ }
  }));
  return out;
}
