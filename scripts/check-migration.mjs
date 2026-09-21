#!/usr/bin/env node
// Checks that every address from the OLD website still works on the NEW site (directly or through a redirect).
//   node scripts/check-migration.mjs --base https://your-new-site.com --file old-urls.txt
// old-urls.txt: one address per line, full web addresses or paths (from the old sitemap, Search Console or a crawl). Lines starting with # are ignored.
// Writes migration-report.csv and exits with an error if anything ends in a 404.
import fs from "node:fs";
const a = process.argv.slice(2); const arg = (k, d = "") => { const i = a.indexOf("--" + k); return i >= 0 && a[i + 1] ? a[i + 1] : d; };
const base = arg("base").replace(/\/$/, ""); const file = arg("file"); const out = arg("out", "migration-report.csv");
if (!base || !file) { console.error("Usage: node scripts/check-migration.mjs --base https://new-site.com --file old-urls.txt"); process.exit(1); }
const paths = [...new Set(fs.readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { try { const u = new URL(l); return u.pathname + u.search; } catch { return l.startsWith("/") ? l : "/" + l; } }))];
const GENERIC = new Set(["/", "/tours", "/destinations", "/egypt-travel-guide"]);
async function trace(p) {
  const hops = []; let cur = p;
  for (let i = 0; i < 7; i++) {
    let r; try { r = await fetch(base + cur, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (migration-check)" }, signal: AbortSignal.timeout(20000) }); } catch (e) { return { hops, final: cur, status: 0, error: String(e.message).slice(0, 80) }; }
    hops.push(r.status); const loc = r.headers.get("location");
    if (r.status >= 300 && r.status < 400 && loc) { cur = new URL(loc, base + cur).pathname + new URL(loc, base + cur).search; continue; }
    return { hops, final: cur, status: r.status };
  }
  return { hops, final: cur, status: -1, error: "redirect loop" };
}
const results = []; let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (next < paths.length) { const p = paths[next++]; const t = await trace(p); const temp = t.hops.some((h) => h === 302 || h === 307);
  const finalPath = t.final.split("?")[0].replace(/\/$/, "") || "/"; const moved = finalPath !== (p.split("?")[0].replace(/\/$/, "") || "/");
  const verdict = t.status === 0 || t.status === -1 ? "ERROR" : t.status === 404 ? "MISSING" : t.status !== 200 ? "CHECK" : moved && GENERIC.has(finalPath) && p !== "/" ? "GENERAL PAGE" : temp ? "TEMPORARY REDIRECT" : t.hops.length > 4 ? "LONG CHAIN" : moved ? "REDIRECTED" : "OK";
  results.push({ old: p, final: t.final, status: t.status, hops: t.hops.join(">"), verdict, error: t.error ?? "" }); } }));
results.sort((x, y) => paths.indexOf(x.old) - paths.indexOf(y.old));
fs.writeFileSync(out, "old address,ends at,status,steps,verdict,note\n" + results.map((r) => [r.old, r.final, r.status, r.hops, r.verdict, r.error].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"));
const count = (v) => results.filter((r) => r.verdict === v).length;
console.log(`Checked ${results.length} old addresses against ${base}`);
for (const v of ["OK", "REDIRECTED", "GENERAL PAGE", "TEMPORARY REDIRECT", "LONG CHAIN", "CHECK", "MISSING", "ERROR"]) if (count(v)) console.log(`  ${v.padEnd(20)} ${count(v)}`);
for (const r of results.filter((x) => ["MISSING", "ERROR", "GENERAL PAGE", "CHECK"].includes(x.verdict)).slice(0, 40)) console.log(`  ${r.verdict.padEnd(13)} ${r.old}  ->  ${r.final} (${r.status})`);
console.log(`Full list saved to ${out}. Fix MISSING ones in Admin > Settings > Redirects, then run this again.`);
process.exit(count("MISSING") || count("ERROR") ? 1 : 0);
