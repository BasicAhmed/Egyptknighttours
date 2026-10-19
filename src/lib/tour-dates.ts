// ---------- Fixed dates on a tour ----------
// A tour can run on set dates only (a group departure, a special cruise). When it has any, customers can book those dates
// and no others: the tour page and the booking steps offer only them, and the server refuses any other date. With no
// fixed dates, a tour can be booked on any future day, as before. No database or server code: the staff form, the website,
// the booking API and the unit tests all use this file.

export const MAX_FIXED_DATES = 200;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
// A real calendar day written YYYY-MM-DD (2026-02-30 is not).
export const isRealDay = (s: string) => ISO.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;

// The dates as stored (a JSON list), cleaned: real days only, no repeats, in order. Anything unreadable counts as none.
export function readFixedDates(stored: string | null | undefined): string[] {
  try { const v = JSON.parse(stored || "[]"); return Array.isArray(v) ? [...new Set(v.map(String).filter(isRealDay))].sort() : []; } catch { return []; }
}

// From the staff form (a JSON list made by the date picker). Refuses anything that is not a real day.
export function parseFixedDates(raw: unknown): { ok: true; dates: string[] } | { ok: false; message: string } {
  const text = String(raw ?? "").trim(); if (!text) return { ok: true, dates: [] };
  let list: unknown;
  try { list = JSON.parse(text); } catch { return { ok: false, message: "Fixed dates: the list couldn't be read. Add the dates again." }; }
  if (!Array.isArray(list)) return { ok: false, message: "Fixed dates: the list couldn't be read. Add the dates again." };
  const bad = list.map(String).find((d) => !isRealDay(d)); if (bad) return { ok: false, message: `Fixed dates: "${bad}" is not a real date.` };
  const dates = [...new Set(list.map(String))].sort();
  if (dates.length > MAX_FIXED_DATES) return { ok: false, message: `Fixed dates: up to ${MAX_FIXED_DATES} dates per tour.` };
  return { ok: true, dates };
}

// The dates a customer can still pick: on or after the first bookable day (tomorrow).
export const upcomingDates = (dates: string[], firstBookable: string) => dates.filter((d) => d >= firstBookable);
// Is this day bookable for a tour with these fixed dates? A tour without fixed dates allows any day (other rules still apply).
export const dateAllowed = (dates: string[], day: string) => !dates.length || dates.includes(day);
