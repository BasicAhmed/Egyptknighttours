import { client } from "@/db";

// Fast in-memory limiter, for high-volume endpoints where being slightly loose is fine.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
// Database-backed limiter for sensitive endpoints (login, bookings, lookups). It counts across every serverless instance.
// If the database can't be reached it falls back to the in-memory limiter, so the site never locks everyone out.
export async function rateLimitPersistent(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  try {
    const r = await client.execute({
      sql: `insert into rate_limits(key, count, window_start) values(?, 1, ?)
            on conflict(key) do update set count = case when window_start < ? then 1 else count + 1 end, window_start = case when window_start < ? then ? else window_start end
            returning count`,
      args: [key, now, now - windowMs, now - windowMs, now],
    });
    return Number(r.rows[0]?.count ?? 1) <= limit;
  } catch { return rateLimit(key, limit, windowMs); }
}
export const clientIp = (h: Headers) => h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
