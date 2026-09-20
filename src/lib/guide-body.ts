// A small, safe markdown-style format for guide articles.
//   ## Heading   ### Sub-heading   - bullet   1. numbered   > key takeaway box   | table | rows |   **bold**   [link](/path)
export type GBlock =
  | { t: "h2" | "h3"; text: string; id: string }
  | { t: "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "callout"; title: string; items: string[]; text: string[] }
  | { t: "table"; head: string[]; rows: string[][] };

export const slugId = (t: string) => t.toLowerCase().replace(/\*\*/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function parseGuideBody(src: string): GBlock[] {
  const lines = src.replace(/\r/g, "").split("\n"); const out: GBlock[] = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("## ")) { out.push({ t: "h2", text: l.slice(3).trim(), id: slugId(l.slice(3)) }); i++; continue; }
    if (l.startsWith("### ")) { out.push({ t: "h3", text: l.slice(4).trim(), id: slugId(l.slice(4)) }); i++; continue; }
    if (l.startsWith(">")) {
      const raw: string[] = []; while (i < lines.length && lines[i].startsWith(">")) { raw.push(lines[i].replace(/^>\s?/, "")); i++; }
      const first = raw[0] ?? ""; const titled = /^\*\*.+\*\*$/.test(first.trim());
      const body = titled ? raw.slice(1) : raw;
      out.push({ t: "callout", title: titled ? first.trim().replace(/\*\*/g, "") : "", items: body.filter((x) => x.startsWith("- ")).map((x) => x.slice(2)), text: body.filter((x) => x.trim() && !x.startsWith("- ")) }); continue;
    }
    if (l.startsWith("|")) {
      const rows: string[][] = []; while (i < lines.length && lines[i].startsWith("|")) { rows.push(cells(lines[i])); i++; }
      const sep = rows.findIndex((r) => r.every((c) => /^:?-{2,}:?$/.test(c)));
      const head = sep === 1 ? rows[0] : rows[0]; const body = rows.filter((r, k) => k !== 0 && !r.every((c) => /^:?-{2,}:?$/.test(c)));
      out.push({ t: "table", head, rows: body }); continue;
    }
    if (/^- /.test(l)) { const items: string[] = []; while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; } out.push({ t: "ul", items }); continue; }
    if (/^\d+\.\s/.test(l)) { const items: string[] = []; while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, "")); i++; } out.push({ t: "ol", items }); continue; }
    const para: string[] = []; while (i < lines.length && lines[i].trim() && !/^(#{2,3} |>|\||- |\d+\.\s)/.test(lines[i])) { para.push(lines[i].trim()); i++; }
    out.push({ t: "p", text: para.join(" ") });
  }
  return out;
}
export const wordCount = (src: string) => src.replace(/[#>|*\-\[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
export type Inline = { k: "text" | "b" | "a"; text: string; href?: string };
export function parseInline(s: string): Inline[] {
  const out: Inline[] = []; const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ k: "text", text: s.slice(last, m.index) });
    if (m[1]) out.push({ k: "b", text: m[1] }); else if (/^(\/|https:\/\/)/.test(m[3])) out.push({ k: "a", text: m[2], href: m[3] }); else out.push({ k: "text", text: m[2] });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ k: "text", text: s.slice(last) });
  return out;
}
