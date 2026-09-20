import { LANGUAGES } from "./countries";

export type ParsedGuide = { name: string; languages: string; phone: string };
const INVISIBLE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u200B]/g;

// Turns local or spaced numbers (for example "011 2000 0009" or "+20 10 0000 0008") into +201120000009 style numbers. Egypt (+20) is assumed when there is no country code.
export function normalizePhone(raw: string): string {
  const s = raw.replace(INVISIBLE, "").trim(); const digits = s.replace(/\D/g, "");
  if (digits.length < 8) return "";
  if (s.startsWith("+")) return "+" + digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("20") && digits.length >= 12) return "+" + digits;
  if (digits.startsWith("0")) return "+20" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("1")) return "+20" + digits;
  return "+" + digits;
}
const isPhoneLine = (l: string) => l.replace(/\D/g, "").length >= 8 && /^[+\d\s\-().]+$/.test(l);
const langOf = (l: string) => LANGUAGES.find((x) => x.toLowerCase() === l.toLowerCase());

// Reads blocks separated by blank lines: a name, a language line, then one or more phone numbers. Only the first number is kept.
export function parseGuides(text: string): ParsedGuide[] {
  const blocks = text.replace(INVISIBLE, "").split(/\r?\n\s*\r?\n/).map((b) => b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)).filter((b) => b.length);
  const out: ParsedGuide[] = [];
  for (const lines of blocks) {
    const phones = lines.filter(isPhoneLine); const rest = lines.filter((l) => !isPhoneLine(l));
    const langs = rest.filter((l) => langOf(l)); const nameLines = rest.filter((l) => !langOf(l));
    const name = nameLines[0]?.replace(/\s+/g, " ").trim(); if (!name || name.length < 2) continue;
    out.push({ name, languages: langs.map((l) => langOf(l)!).join(", "), phone: phones[0] ? normalizePhone(phones[0]) : "" });
  }
  return out;
}
