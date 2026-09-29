export const money = (n: number, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const parseJson = <T,>(s: string, fallback: T): T => { try { return JSON.parse(s) as T; } catch { return fallback; } };
function siteUrl() {
  // Live site: always the real domain, even if NEXT_PUBLIC_SITE_URL is forgotten in Vercel. Previews and local runs use their own address.
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() || (process.env.VERCEL_ENV === "production" ? "https://egyptknight.com" : process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  try { return new URL(raw.startsWith("http") ? raw : `https://${raw}`).origin; } catch { return "http://localhost:3000"; }
}
export const SITE = siteUrl();
export const WA = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "") || "201128348803";
export const waLink = (text: string) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
export const CATEGORY_LABEL: Record<string, string> = { DAY: "Day tour", MULTI_DAY: "Multi-day", NILE_CRUISE: "Nile cruise", TRANSFER: "Transfer" };
// One wording for a tour's length everywhere (cards, tour page, PDF): "8 days / 7 nights" for multi-day trips, hours for day tours.
export const tourNights = (t: { durationDays: number; durationNights?: number | null }) => t.durationNights ?? Math.max(0, t.durationDays - 1);
export const duration = (t: { durationDays: number; durationHours: number; durationNights?: number | null }) => {
  if (t.durationDays > 1 || (t.durationNights ?? 0) > 0) { const n = tourNights(t); return `${t.durationDays} day${t.durationDays === 1 ? "" : "s"} / ${n} night${n === 1 ? "" : "s"}`; }
  return `${t.durationHours} hour${t.durationHours === 1 ? "" : "s"}`;
};
export const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
