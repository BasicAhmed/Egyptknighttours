import { blankItinerary, blk, day as newDay, suggestHooks, uid } from "./itinerary-templates";
import type { Block, BlockType, Day, ItineraryContent } from "../pdf/types";

export type ImportReport = { days: number; blocks: number; included: number; excluded: number; hasPrice: boolean; warnings: string[] };
export type ImportResult = { name: string; content: ItineraryContent; report: ImportReport };

const clean = (s: string) => s.replace(/\\u200b/gi, "").replace(/[\u200B\u200C\u200D\uFEFF]/g, "").replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ").trim();
const DAY_RE = /^\s*day\s*(\d{1,2})\s*(?:[:\-–—.)]\s*|\s+)(.*)$/i;
const INCLUDES_RE = /^(the\s+)?(price\s+includes?|what'?s\s+included|included|inclusions?|includes?)\b[\s:]*$/i;
const EXCLUDES_RE = /^(the\s+)?(price\s+does\s+not\s+include|not\s+included|what'?s\s+not\s+included|excluded|exclusions?|excludes?|does\s+not\s+include)\b[\s:]*$/i;
const PRICE_RE = /^(price\s+per\s+person|price\s*:|total\s+price|rate\s+per\s+person|from\s+[€$£]|[€$£]\s*[\d,]+)/i;
const PAYTERMS_RE = /^payment\s+terms?\b[\s:]*(.*)$/i;
const IMPORTANT_RE = /^(important(\s+information)?|notes?|good\s+to\s+know|cancellation(\s+policy)?)\b[\s:]*$/i;
const BULLET_RE = /^\s*[•●▪◦·\-–*]\s+/;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const stripDot = (s: string) => s.replace(/[.\s]+$/, "");

// Groups wrapped lines into list items. Bullets start an item; otherwise a line starting with a capital or digit does.
function toItems(lines: string[]): string[] {
  const hasBullets = lines.some((l) => BULLET_RE.test(l)); const out: string[] = [];
  for (const raw of lines) {
    const l = raw.replace(BULLET_RE, "").trim(); if (!l) continue;
    const startsNew = hasBullets ? BULLET_RE.test(raw) : /^[A-Z0-9]/.test(l);
    if (startsNew || !out.length) out.push(l); else out[out.length - 1] += " " + l;
  }
  return out.map((x) => stripDot(x)).filter(Boolean);
}

const TIME_RE = /^(early\s+morning|in\s+the\s+morning|morning|in\s+the\s+afternoon|afternoon|in\s+the\s+evening|evening|at\s+night|later\s+in\s+the\s+day)\b[,:]?\s*/i;
function classify(s: string): BlockType {
  const t = s.toLowerCase();
  const sightseeing = /visit|tour|excursion|explore|temple|valley|museum|pyramid|mosque|citadel|sphinx|palace|market|bazaar|balloon|safari|snorkel|dive|colossi|dam\b/.test(t);
  if (/^(breakfast|lunch|dinner|brunch)\b/.test(t)) return "MEAL";
  if (/^(early morning )?(then,? )?transfer/.test(t)) return sightseeing ? "TOUR" : "TRANSFER";
  if (/^(arrival|welcome)/.test(t)) return sightseeing ? "TOUR" : "TRANSFER";
  if (/\bflight\b|\bfly\b|airline/.test(t)) return "FLIGHT";
  if (/free time|at leisure|leisure|relax/.test(t)) return "FREE_TIME";
  if (sightseeing) return "TOUR";
  if (/\b(lunch|dinner)\b/.test(t)) return "MEAL";
  if (/transfer to|pick ?up|drop ?off|assistance with customs/.test(t)) return "TRANSFER";
  return "ACTIVITY";
}
const LABEL: Record<BlockType, string> = { ACTIVITY: "Activity", TOUR: "Sightseeing", TRANSPORT: "Transport", TRANSFER: "Transfer", FLIGHT: "Flight", HOTEL: "Hotel", MEAL: "Meal", FREE_TIME: "Free time", NOTE: "Note", MEETING_POINT: "Meeting point", GUIDE: "Guide", INFO: "Info" };

function sentenceToBlocks(sentence: string): Block[] {
  let s = clean(sentence); if (!s) return [];
  s = s.replace(/^(afterwards|then|later|next|after that|finally),?\s+/i, ""); s = cap(s);
  let time = ""; const tm = TIME_RE.exec(s); if (tm) { time = cap(tm[1].toLowerCase().replace(/^in the /, "")); s = cap(s.slice(tm[0].length)); }
  // "Breakfast at the hotel, transfer to ..." -> a meal, then the rest
  const meal = /^(breakfast|lunch|dinner)\b[^,.;]*[,;]\s+(.+)$/i.exec(s);
  if (meal && meal[2].length > 12 && !/^(and|or|lunch|dinner|breakfast|overnight)\b/i.test(meal[2])) { const head = s.slice(0, s.length - meal[2].length).replace(/[,;]\s*$/, ""); return [...sentenceToBlocks(head), ...sentenceToBlocks(cap(meal[2]))].map((b, i) => (i === 0 && time ? { ...b, time } : b)); }
  const type = classify(s); const plain = stripDot(s);
  let title = plain, description = "";
  if (plain.length > 80) {
    const c = plain.indexOf(", "); 
    if (c >= 12 && c <= 70) { title = plain.slice(0, c); description = cap(plain.slice(c + 2)) + "."; } else { title = LABEL[type]; description = plain + "."; }
  }
  return [blk(type, time, title, description)];
}

function locationOf(rest: string) {
  const r = stripDot(clean(rest)).replace(/\s*[\/&]\s*/g, " · ").replace(/\s{2,}/g, " ");
  return /[a-z]/i.test(r) ? r : "";
}
function highlightOf(title: string) {
  if (/^(arrival|on the way|return|transfer(?! to visit)|then|breakfast|lunch|dinner)/i.test(title)) return "";
  const t = title.replace(/^(departure from the hotel for |continue the |transfer to (visit )?|then,? )/i, "").replace(/^(visits?|excursion|tours?)( to| of| with)?\s+(an?\s+excursion to\s+)?(the\s+)?/i, "").trim();
  return t.length >= 8 && t.length <= 60 && !Object.values(LABEL).includes(t) ? cap(t) : "";
}

export function parseItineraryText(rawText: string, filename = "Imported itinerary"): ImportResult {
  const warnings: string[] = [];
  const lines = rawText.split(/\r?\n/).map(clean).filter((l) => l && !/^description$/i.test(l) && !/^page\s+\d+(\s+of\s+\d+)?$/i.test(l));
  const firstDay = lines.findIndex((l, i) => DAY_RE.test(l) && (DAY_RE.exec(l)![2].length <= 90) && (i === 0 || true));
  const c = blankItinerary();
  const base = filename.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();

  // Header: title, subtitle in brackets, then the intro paragraph
  const head = lines.slice(0, firstDay < 0 ? Math.min(lines.length, 6) : firstDay);
  let ti = 0; const titleParts: string[] = [];
  while (ti < head.length && titleParts.length < 3 && head[ti].length <= 70 && !/[.!?]$/.test(head[ti])) titleParts.push(head[ti++]);
  const sub = titleParts.find((p) => /^\(.*\)$/.test(p)); const main = titleParts.filter((p) => p !== sub);
  c.title = main.join(" ").trim() || base; if (sub) c.subtitle = sub.replace(/^\(|\)$/g, "").trim();
  c.intro = head.slice(ti).join(" ").trim();
  if (!main.length) warnings.push("Couldn't find a title, so the file name was used.");

  type Sec = { kind: "day" | "inc" | "exc" | "price" | "pay" | "imp"; day?: { n: number; loc: string; lines: string[] }; lines: string[] };
  const sections: Sec[] = []; let cur: Sec | null = null;
  const start = firstDay < 0 ? lines.length : firstDay;
  for (const l of lines.slice(start)) {
    const d = DAY_RE.exec(l);
    const pt = PAYTERMS_RE.exec(l);
    if (d && d[2].length <= 90) { cur = { kind: "day", day: { n: Number(d[1]), loc: locationOf(d[2]), lines: [] }, lines: [] }; sections.push(cur); }
    else if (INCLUDES_RE.test(l)) { cur = { kind: "inc", lines: [] }; sections.push(cur); }
    else if (EXCLUDES_RE.test(l)) { cur = { kind: "exc", lines: [] }; sections.push(cur); }
    else if (pt) { cur = { kind: "pay", lines: pt[1] ? [pt[1]] : [] }; sections.push(cur); }
    else if (PRICE_RE.test(l)) { cur = { kind: "price", lines: [l] }; sections.push(cur); }
    else if (IMPORTANT_RE.test(l)) { cur = { kind: "imp", lines: [] }; sections.push(cur); }
    else if (cur) { if (cur.day) cur.day.lines.push(l); else cur.lines.push(l); }
  }

  const used = new Set<string>(); const days: Day[] = [];
  for (const sec of sections.filter((x) => x.kind === "day" && x.day)) {
    const dd = sec.day!;
    const text = dd.lines.map((ln, i) => (i < dd.lines.length - 1 && ln.length <= 60 && !/[.!?:;,]$/.test(ln) && /^[A-Z]/.test(dd.lines[i + 1]) ? ln + "." : ln)).join(" ").replace(/\s+/g, " ").trim();
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((x) => x.trim()).filter(Boolean);
    const blocks: Block[] = []; let hotel = { name: "", stars: "", notes: "", link: "" };
    for (const sn of sentences) {
      const ov = /^overnight\b/i.test(sn) && sn.length < 90;
      if (ov) { hotel = { ...hotel, name: hotel.name || stripDot(sn) }; continue; }
      if (blocks.length && /^(the latter|it |this |these |dedicated to|which |there )/i.test(sn)) { const last = blocks[blocks.length - 1]; last.description = (last.description ? last.description + " " : "") + sn; continue; }
      blocks.push(...sentenceToBlocks(sn));
    }
    if (!hotel.name && /overnight[^.]*on board/i.test(text)) hotel = { ...hotel, name: /cruise|nile|ship|boat/i.test(text + dd.loc) ? "On board your Nile cruise" : "On board" };
    const ctx = `${dd.loc} ${text}`;
    const pick = suggestHooks(ctx).find((x) => !used.has(x.title));
    const title = pick?.title ?? (dd.loc ? `Day ${dd.n}: ${dd.loc.split(" · ")[0]}` : `Day ${dd.n}`); used.add(title);
    const d = newDay(title, pick?.hook ?? "Another chapter of your Egyptian adventure.", dd.loc, blocks, hotel);
    d.id = uid(); days.push(d);
  }
  c.days = days.length ? days : [newDay("", "", "", [])];
  if (!days.length) warnings.push("No day-by-day sections were found (looking for lines like 'Day 1: Cairo'). Add the days manually.");

  const list = (k: Sec["kind"]) => sections.filter((x) => x.kind === k).flatMap((x) => toItems(x.lines));
  c.included = list("inc"); c.excluded = list("exc"); c.important = list("imp");
  if (!c.included.length) warnings.push("No 'Included' list found.");
  const price = sections.find((x) => x.kind === "price"); if (price) c.priceLabel = clean(price.lines.join(" ")).replace(/\s*payment terms.*$/i, "").slice(0, 120);
  const pay = sections.find((x) => x.kind === "pay"); if (pay) c.paymentTerms = clean(pay.lines.join(" ")).slice(0, 400);
  const pt2 = !pay && price ? /payment terms?:?\s*(.+)$/i.exec(price.lines.join(" ")) : null; if (pt2) c.paymentTerms = pt2[1].slice(0, 400);
  if (!c.priceLabel) warnings.push("No price found. Add the price on the closing page if you want it shown.");

  c.destinations = [...new Set(days.flatMap((d) => d.location.split(" · ").map((x) => x.trim()).filter((x) => x && x.length < 30)))].slice(0, 8);
  c.highlights = [...new Set(days.flatMap((d) => d.blocks.filter((b) => b.type === "TOUR").map((b) => highlightOf(b.title))).filter(Boolean))].slice(0, 6);
  c.sceneKind = "auto"; c.ctaLabel = "Complete your booking";
  const blocks = days.reduce((a, d) => a + d.blocks.length, 0);
  return { name: c.title || base, content: c, report: { days: days.length, blocks, included: c.included.length, excluded: c.excluded.length, hasPrice: !!c.priceLabel, warnings } };
}

export async function extractPdfText(buf: Uint8Array): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(buf);
  const r = await extractText(pdf, { mergePages: false });
  return { text: (r.text as string[]).join("\n"), pages: r.totalPages };
}
