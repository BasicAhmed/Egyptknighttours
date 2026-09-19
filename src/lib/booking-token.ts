import { createHmac, timingSafeEqual } from "node:crypto";
// A booking page link carries a signed token so only the customer (or someone they share the link with) can open it.
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set (16+ chars)");
  return s;
}
export const signRef = (ref: string) => createHmac("sha256", secret()).update("booking:" + ref).digest("base64url").slice(0, 22);
export function verifyRef(ref: string, token?: string | null) {
  if (!token) return false;
  const a = Buffer.from(signRef(ref)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function normalizeRef(input: string) {
  const c = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^EK[A-Z0-9]{6}$/.test(c) ? `EK-${c.slice(2)}` : null;
}

// Document download links (invoices, itineraries) are signed per document id.
export const signDoc = (id: string) => createHmac("sha256", secret()).update("doc:" + id).digest("base64url").slice(0, 22);
export function verifyDoc(id: string, token?: string | null) {
  if (!token) return false;
  const a = Buffer.from(signDoc(id)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
