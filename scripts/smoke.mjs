// Smoke test: crawls the key pages of a running site and checks the things that matter for SEO, security and branding.
// Usage: node scripts/smoke.mjs http://localhost:3000
const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PAGES = ["/", "/tours", "/destinations", "/destinations/luxor", "/egypt-travel-guide", "/egypt-travel-guide/egypt-travel-guide-2026", "/egypt-travel-guide/best-time-to-visit-egypt", "/egypt-tours/private-tours-egypt", "/faq", "/contact", "/plan-my-trip", "/terms", "/privacy-policy", "/track", "/tours/giza-pyramids-sphinx-day-tour"];
let failed = 0; const fail = (m) => { failed++; console.log("  FAIL", m); };
const get = (p, o = {}) => fetch(base + p, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (smoke)" }, ...o });

for (const p of PAGES) {
  const r = await get(p); const html = await r.text(); const head = html.slice(0, html.indexOf("</head>") + 7); const before = failed;
  if (r.status !== 200) { fail(`${p} returned ${r.status}`); continue; }
  if (!/<title>[^<]{10,}<\/title>/.test(head)) fail(`${p}: no <title> in <head>`);
  const desc = /<meta name="description" content="([^"]*)"/.exec(head)?.[1] ?? ""; if (desc.length < 50 || desc.length > 200) fail(`${p}: meta description ${desc.length} chars`);
  if (!/<link rel="canonical"/.test(head) && !["/track", "/plan-my-trip", "/contact", "/faq"].includes(p)) fail(`${p}: no canonical`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length; if (h1 !== 1) fail(`${p}: ${h1} <h1> tags`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { fail(`${p}: invalid JSON-LD`); } }
  if (!/Nino Techy/.test(html)) fail(`${p}: Nino Techy credit missing`);
  if (/undefined|\[object Object\]|NaN/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) fail(`${p}: contains "undefined", "[object Object]" or "NaN"`);
  for (const h of ["content-security-policy", "strict-transport-security", "x-content-type-options"]) if (!r.headers.get(h)) fail(`${p}: missing ${h} header`);
  if (failed === before) console.log("  ok  ", p);
}
for (const [p, want] of [["/robots.txt", /Disallow: \/admin/], ["/sitemap.xml", /egypt-travel-guide/], ["/manifest.webmanifest", /Egypt Knight/], ["/humans.txt", /Nino Techy/]]) { const r = await get(p); const t = await r.text(); if (r.status !== 200 || !want.test(t)) fail(`${p} missing or wrong`); else console.log("  ok  ", p); }
const guard = [["/admin", [302, 307, 308]], ["/api/admin/export/orders", [404]], ["/api/admin/files/nope", [404]], ["/api/cron/maintenance", [401]], ["/api/health", [200]]];
for (const [p, ok] of guard) { const r = await get(p); if (!ok.includes(r.status)) fail(`${p} returned ${r.status}, expected ${ok.join("/")}`); else console.log("  ok  ", p, r.status); }
{ const r = await get("/api/admin/media", { method: "POST" }); if (![401, 400].includes(r.status)) fail(`upload without login returned ${r.status}`); else console.log("  ok   media upload is staff-only"); }
console.log(failed ? `\n${failed} problem(s) found` : "\nAll smoke checks passed"); process.exit(failed ? 1 : 0);
