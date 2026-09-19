export const money = (n: number, cur = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
export const dLong = (iso: string) => { if (!iso) return ""; const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
export const dWeek = (iso: string) => { if (!iso) return ""; return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); };
export const lines = (s: string) => (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
