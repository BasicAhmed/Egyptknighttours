// Helpers for moving from an old website: clean up addresses, read pasted lists and apply built-in rules for common WordPress tour-site addresses.
export type Legacy = { to: string; status: 301 | 302 };
const LANG = /^\/(fr|ar|de|es|it|ru|pt|nl|pl|zh|ja|ko|tr)(?=\/|$)/;

export function normalizePath(input: string): string | null {
  let s = (input ?? "").trim(); if (!s) return null;
  if (/^https?:\/\//i.test(s)) { try { s = new URL(s).pathname; } catch { return null; } }
  s = s.split("#")[0].split("?")[0]; if (!s.startsWith("/")) s = "/" + s;
  try { s = decodeURIComponent(s); } catch { return null; }
  s = s.replace(/\/{2,}/g, "/").toLowerCase(); if (s.length > 1) s = s.replace(/\/+$/, "");
  if (/\s|\.\.|[<>"]/.test(s) || s.length > 300) return null;
  return s || "/";
}
// Where an old address may point: a page on this site only (never another website).
export function normalizeTarget(input: string, hosts: string[]): string | null {
  let s = (input ?? "").trim(); if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    let u: URL; try { u = new URL(s); } catch { return null; }
    const h = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!hosts.map((x) => x.replace(/^www\./, "").toLowerCase()).includes(h)) return null; s = u.pathname + u.search;
  }
  if (!s.startsWith("/") || s.startsWith("//") || /\s|[<>"]/.test(s) || s.length > 500) return null;
  return s;
}
// One redirect per line: "old-address new-address", separated by a space, comma, tab, -> or =>. Lines starting with # are ignored.
export function parseRedirectList(text: string) {
  const rows: { from: string; to: string; line: number }[] = []; const errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const l = raw.trim(); if (!l || l.startsWith("#")) return;
    const parts = l.split(/\s*(?:\t|,|->|=>)\s*|\s+/).filter(Boolean);
    if (parts.length < 2) errors.push(`Line ${i + 1}: needs an old and a new address`); else rows.push({ from: parts[0], to: parts[1], line: i + 1 });
  });
  return { rows, errors };
}
// Built-in rules for the usual WordPress tour-theme addresses. Anything not covered here is added by hand in the admin.
export function builtinLegacy(path: string, dests: ReadonlySet<string>): Legacy | null {
  const lang = LANG.exec(path); if (lang) { const rest = path.slice(lang[0].length) || "/"; return builtinLegacy(rest, dests) ?? { to: rest, status: 301 }; }
  let m: RegExpExecArray | null;
  if ((m = /^\/tour-destination\/([^/]+)$/.exec(path))) return { to: m[1] !== "egypt" && dests.has(m[1]) ? `/destinations/${m[1]}` : "/tours", status: 301 };
  if ((m = /^\/tour-activities\/([^/]+)$/.exec(path))) return { to: m[1] === "cruises-sailing" ? "/egypt-tours/nile-cruises-egypt" : "/tours", status: 301 };
  if (/^\/custom-pac?ka?ge?s?$/.test(path) || /^\/custom-pacakage$/.test(path)) return { to: "/plan-my-trip", status: 301 };
  if (/^\/(cart|checkout|my-account|tf-search-form|shop|search)$/.test(path)) return { to: "/tours", status: 301 };
  if (/^\/(about|about-us)$/.test(path)) return { to: "/", status: 301 };
  if (/^\/(faqs|frequently-asked-questions)$/.test(path)) return { to: "/faq", status: 301 };
  if (/^\/(contact-us|contacts)$/.test(path)) return { to: "/contact", status: 301 };
  return null;
}
