// Small helpers for reading a spreadsheet exported as CSV.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let f = ""; let q = false; const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); f = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}
export function csvObjects(text: string): Record<string, string>[] {
  const [head, ...rest] = parseCsv(text); if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return rest.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}
// "$1.550,00", "1,550.50", "€ 1 200" and "55" all become numbers.
export function parseMoney(v: string): number | null {
  let s = (v ?? "").replace(/[^0-9.,]/g, ""); if (!s) return null;
  const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
  if (lc >= 0 && ld >= 0) { const dec = lc > ld ? "," : "."; const thou = dec === "," ? "." : ","; s = s.split(thou).join("").replace(dec, "."); }
  else if (lc >= 0) s = /,\d{1,2}$/.test(s) && s.split(",").length === 2 ? s.replace(",", ".") : s.split(",").join("");
  else if (ld >= 0 && s.split(".").length > 2) s = s.split(".").join("");
  else if (ld >= 0 && /\.\d{3}$/.test(s) && !/^0\./.test(s)) s = s.replace(".", "");
  const n = Number(s); return Number.isFinite(n) ? n : null;
}
export const slugify = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "tour";
export const splitList = (v: string) => (v ?? "").split(/\s*\|\s*|\r?\n/).map((x) => x.trim()).filter(Boolean);
