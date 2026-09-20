import { unstable_cache, revalidateTag } from "next/cache";

// Cached database reads for the public website. Results are kept for a few minutes and cleared instantly when staff edit content.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
export function revive<T>(v: T): T {
  if (typeof v === "string" && ISO.test(v)) return new Date(v) as unknown as T;
  if (Array.isArray(v)) return v.map(revive) as unknown as T;
  if (v && typeof v === "object" && !(v instanceof Date)) return Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, revive(x)])) as T;
  return v;
}
export function cachedQuery<A extends unknown[], R>(name: string, fn: (...a: A) => Promise<R>, tags: string[], revalidate = 300) {
  return async (...args: A): Promise<R> => revive(await unstable_cache(() => fn(...args), [name, JSON.stringify(args)], { tags, revalidate })());
}
export const invalidate = (...tags: string[]) => { for (const t of tags) revalidateTag(t); };
