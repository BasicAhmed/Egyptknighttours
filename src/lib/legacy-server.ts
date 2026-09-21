import { notFound, permanentRedirect, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { cachedQuery } from "./cache";
import { allDestinations } from "./queries";
import { builtinLegacy, normalizePath, type Legacy } from "./legacy";

const redirectFor = cachedQuery("redirectFor", async (p: string) => (await db.select().from(s.redirects).where(eq(s.redirects.fromPath, p)))[0] ?? null, ["redirects"]);

export async function resolveLegacy(input: string): Promise<(Legacy & { source: "manual" | "built-in" }) | null> {
  const p = normalizePath(input); if (!p) return null;
  const m = await redirectFor(p); if (m && m.toPath !== p) return { to: m.toPath, status: m.status === 302 ? 302 : 301, source: "manual" };
  const dests = new Set((await allDestinations()).map((d) => d.slug)); const b = builtinLegacy(p, dests);
  return b && b.to !== p ? { ...b, source: "built-in" } : null;
}
// Used when a page is not found: send old addresses to their new home, otherwise show the normal 404.
export async function legacyOrNotFound(path: string): Promise<never> {
  const r = await resolveLegacy(path);
  if (r) { if (r.status === 302) redirect(r.to); permanentRedirect(r.to); }
  notFound();
}
