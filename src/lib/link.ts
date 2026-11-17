// The private link between Egypt Knight Tours and The Royal Nile Residence (the same file lives in both projects).
// Each system keeps its own database and admin; they only send each other bookings and requests.
// Every message is signed with LINK_SECRET (the same long random text set on both sites) plus a timestamp, so nobody
// else can send fake bookings, and an old message can't be replayed later. Server-only.
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => (process.env.LINK_SECRET ?? "").trim();
const MAX_AGE_MS = 5 * 60_000;

/** True when this site has a link secret and the other site's address. */
export function linkReady(otherUrl: string | undefined): boolean {
  return secret().length >= 32 && /^https?:\/\//.test((otherUrl ?? "").trim());
}

export function signLink(ts: string, method: string, path: string, body: string): string {
  return createHmac("sha256", secret()).update(`${ts}\n${method.toUpperCase()}\n${path}\n${body}`).digest("hex");
}

/** Checks an incoming request. `body` is the raw request body text ("" for GET). */
export function verifyLink(req: Request, body: string): boolean {
  if (secret().length < 32) return false;
  const ts = req.headers.get("x-link-ts") ?? "";
  const sig = req.headers.get("x-link-sig") ?? "";
  if (!/^\d{13}$/.test(ts) || Math.abs(Date.now() - Number(ts)) > MAX_AGE_MS || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const u = new URL(req.url);
  const want = Buffer.from(signLink(ts, req.method, u.pathname + u.search, body), "hex");
  const got = Buffer.from(sig, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

export type LinkResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Calls the other site. `path` includes any query string, e.g. "/api/link/requests?refs=CR-1". */
export async function callLink<T>(otherUrl: string | undefined, method: "GET" | "POST", path: string, data?: unknown): Promise<LinkResult<T>> {
  if (!linkReady(otherUrl)) return { ok: false, error: "The link isn't set up yet (LINK_SECRET and the other site's address are missing)." };
  const body = method === "POST" ? JSON.stringify(data ?? {}) : "";
  const ts = String(Date.now());
  try {
    const r = await fetch(otherUrl!.trim().replace(/\/$/, "") + path, {
      method, body: method === "POST" ? body : undefined, cache: "no-store", signal: AbortSignal.timeout(12_000),
      headers: { "content-type": "application/json", "x-link-ts": ts, "x-link-sig": signLink(ts, method, path, body) },
    });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) return { ok: false, error: typeof j.error === "string" ? j.error : `The other system answered with error ${r.status}.` };
    return { ok: true, data: j as T };
  } catch {
    return { ok: false, error: "Couldn't reach the other system right now. Please try again in a minute." };
  }
}

/** Reads and verifies an incoming request; returns the parsed JSON body, or a ready error Response. */
export async function readLinked(req: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; res: Response }> {
  const text = req.method === "GET" ? "" : await req.text();
  if (!verifyLink(req, text)) return { ok: false, res: Response.json({ error: "Not allowed." }, { status: 401 }) };
  if (!text) return { ok: true, body: {} };
  try { return { ok: true, body: JSON.parse(text) as Record<string, unknown> }; } catch { return { ok: false, res: Response.json({ error: "Bad request." }, { status: 400 }) }; }
}
