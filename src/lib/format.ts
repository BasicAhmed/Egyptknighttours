export const money = (n: number, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const parseJson = <T,>(s: string, fallback: T): T => { try { return JSON.parse(s) as T; } catch { return fallback; } };
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "201000000000";
export const waLink = (text: string) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
export const CATEGORY_LABEL: Record<string, string> = { DAY: "Day tour", MULTI_DAY: "Multi-day", NILE_CRUISE: "Nile cruise", TRANSFER: "Transfer" };
export const duration = (t: { durationDays: number; durationHours: number }) => t.durationDays > 1 ? `${t.durationDays} days` : `${t.durationHours} hours`;
export const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
