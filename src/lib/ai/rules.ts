// ---------- AI assistant: the rules (no database, no network) ----------
// Everything that decides cost, limits and what counts as real data lives here, so the customer planner, the staff
// assistant, the API routes and the unit tests all use the same rules.
import type { Block, Day, ItineraryContent } from "@/pdf/types";

// ----- Models and prices (USD per million tokens, from Anthropic's pricing page) -----
export const MODELS = { haiku: "claude-haiku-5-5", sonnet: "claude-sonnet-5-5" } as const;
export type ModelKey = keyof typeof MODELS;
type Price = { input: number; output: number; cacheWrite: number; cacheRead: number };
const PRICES: Record<ModelKey, { normal: Price; long?: Price }> = {
  // Haiku 5.5 costs more when a single prompt is over 100,000 tokens; we keep prompts far below that.
  haiku: { normal: { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 }, long: { input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 } },
  sonnet: { normal: { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 } },
};
export type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null };
export function costOf(model: ModelKey, u: Usage): number {
  const prompt = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
  const p = prompt > 100_000 && PRICES[model].long ? PRICES[model].long! : PRICES[model].normal;
  return (u.input_tokens * p.input + u.output_tokens * p.output + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite + (u.cache_read_input_tokens ?? 0) * p.cacheRead) / 1_000_000;
}

// ----- Switches (Settings → AI). Everything starts OFF. -----
export const AI_DEFAULTS = { "ai.customer": "off", "ai.staff": "off", "ai.dailyCapUsd": "1", "ai.itineraryModel": "haiku" } as const;
export type AiConfig = { customer: boolean; staff: boolean; dailyCapUsd: number; itineraryModel: ModelKey };
export function readAiConfig(g: Record<string, string | undefined>): AiConfig {
  const cap = Number(g["ai.dailyCapUsd"]);
  return { customer: g["ai.customer"] === "on", staff: g["ai.staff"] === "on", dailyCapUsd: Number.isFinite(cap) && cap >= 0 ? Math.min(cap, 100) : 1, itineraryModel: g["ai.itineraryModel"] === "sonnet" ? "sonnet" : "haiku" };
}

// ----- Limits -----
export const LIMITS = {
  customerMessageChars: 1500, customerTurnsPerChat: 25, customerPerHour: 20, customerPerDay: 60,
  staffMessageChars: 4000, staffPerHour: 60,
  submitsPerIpPerDay: 5, submitsPerEmailPerDay: 3, codesPerEmailPerHour: 3, codeTries: 5, codeMinutes: 10,
  maxSteps: 6, maxOutputTokens: 1500, historyKept: 24,
} as const;
// One message from a person: trimmed, invisible characters removed, not empty, not too long.
export function cleanMessage(raw: unknown, max: number): { ok: true; text: string } | { ok: false; message: string } {
  const text = String(raw ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​-‏‪-‮⁦-⁩]/g, "").trim();
  if (!text) return { ok: false, message: "Write a message first." };
  if (text.length > max) return { ok: false, message: `Please keep it under ${max.toLocaleString("en-US")} characters.` };
  return { ok: true, text };
}

// ----- Real contact details only -----
const DISPOSABLE = ["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com", "getnada.com", "sharklasers.com", "dispostable.com", "fakeinbox.com", "throwawaymail.com", "maildrop.cc", "mintemail.com", "emailondeck.com", "tempail.com", "moakt.com", "mohmal.com"];
export function checkEmail(raw: unknown): { ok: true; email: string } | { ok: false; message: string } {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,24}$/.test(email) || email.includes("..")) return { ok: false, message: "Enter a valid email address." };
  const domain = email.split("@")[1];
  if (DISPOSABLE.some((d) => domain === d || domain.endsWith("." + d))) return { ok: false, message: "Please use your personal or work email, not a temporary one." };
  if (/^(test|example|fake|asdf|qwerty)@/.test(email) || /(^|\.)example\.(com|org|net)$/.test(domain)) return { ok: false, message: "Enter your real email address." };
  return { ok: true, email };
}
// A WhatsApp/phone number with its country code: 8 to 15 digits, not one digit repeated, not a counting run.
export function checkPhone(raw: unknown): { ok: true; phone: string } | { ok: false; message: string } {
  const s = String(raw ?? "").trim();
  if (!/^\+?[\d\s().-]{8,24}$/.test(s)) return { ok: false, message: "Enter your WhatsApp number with the country code, e.g. +44 7700 900123." };
  const d = s.replace(/\D/g, "").replace(/^00/, "");
  if (d.length < 8 || d.length > 15) return { ok: false, message: "That number doesn't look complete. Include the country code." };
  if (/^(\d)\1+$/.test(d) || "0123456789012345".includes(d) || "9876543210987654".includes(d)) return { ok: false, message: "Enter your real WhatsApp number." };
  if (!s.startsWith("+") && !s.startsWith("00")) return { ok: false, message: "Start the number with your country code, e.g. +44 or +1." };
  return { ok: true, phone: "+" + d };
}
export function checkName(raw: unknown): { ok: true; name: string } | { ok: false; message: string } {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 80 || !/\p{L}/u.test(name) || /https?:|www\.|[<>{}]/i.test(name)) return { ok: false, message: "Enter your full name." };
  return { ok: true, name };
}

// ----- The itinerary the AI proposes: checked against real data before anything is shown or saved -----
export type DraftDay = { title: string; location: string; description: string; tourSlugs: string[] };
export type Draft = { title: string; summary: string; days: DraftDay[]; notes: string };
export type Known = { destinations: string[]; tours: { slug: string; title: string }[] };
const str = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
export function checkDraft(raw: unknown, known: Known): { ok: true; draft: Draft; warnings: string[] } | { ok: false; message: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const days = Array.isArray(r.days) ? r.days : [];
  if (days.length < 1 || days.length > 21) return { ok: false, message: "An itinerary needs 1 to 21 days." };
  const destByLower = new Map(known.destinations.map((d) => [d.toLowerCase(), d]));
  const slugs = new Set(known.tours.map((t) => t.slug));
  const warnings: string[] = [];
  const out: DraftDay[] = [];
  for (const [i, d0] of days.entries()) {
    const d = (d0 ?? {}) as Record<string, unknown>;
    const title = str(d.title, 90); const description = str(d.description, 700);
    if (!title || !description) return { ok: false, message: `Day ${i + 1} needs a title and a description.` };
    const loc = str(d.location, 60); const match = destByLower.get(loc.toLowerCase());
    if (loc && !match) warnings.push(`Day ${i + 1}: "${loc}" is not one of our destinations; shown as written for staff to check.`);
    const tourSlugs = (Array.isArray(d.tourSlugs) ? d.tourSlugs : []).map((x) => String(x)).filter((x) => { const ok = slugs.has(x); if (!ok) warnings.push(`Day ${i + 1}: tour "${x}" does not exist and was removed.`); return ok; }).slice(0, 4);
    out.push({ title, location: match ?? loc, description, tourSlugs });
  }
  const title = str(r.title, 100) || `${out.length}-day Egypt trip`;
  return { ok: true, draft: { title, summary: str(r.summary, 600), days: out, notes: str(r.notes, 600) }, warnings };
}
// The checked draft as an itinerary the staff editor and the PDF understand. No price: staff price it.
export function draftToContent(d: Draft, known: Known, rid: () => string): ItineraryContent {
  const titleOf = new Map(known.tours.map((t) => [t.slug, t.title]));
  const days: Day[] = d.days.map((x) => ({
    id: rid(), title: x.title, hook: "", location: x.location, date: "", imageUrl: "", notes: "",
    hotel: { name: "", stars: "", notes: "", link: "" },
    blocks: [
      { id: rid(), type: "ACTIVITY", time: "", title: x.title, description: x.description, location: x.location, link: "", imageUrl: "", notes: "" } as Block,
      ...x.tourSlugs.map((slug) => ({ id: rid(), type: "TOUR", time: "", title: titleOf.get(slug) ?? slug, description: "", location: x.location, link: `/tours/${slug}`, imageUrl: "", notes: "" } as Block)),
    ],
  }));
  return { title: d.title, subtitle: "Drafted with our AI trip planner", intro: d.summary, coverImageUrl: "", customerName: "", travelers: "", startDate: "", endDate: "",
    destinations: [...new Set(d.days.map((x) => x.location).filter(Boolean))], highlights: [], days, included: [], excluded: [], important: d.notes ? [d.notes] : [],
    priceLabel: "", paymentTerms: "", ctaUrl: "", ctaLabel: "Complete your booking", sceneKind: "auto", durationDays: d.days.length, durationNights: Math.max(0, d.days.length - 1) };
}

// ----- Leakage: where customers fall out, worst first -----
export type LeakInput = { tourViews: number; startedBooking: number; checkout: number; purchases: number; abandoned: number; inquiriesUnanswered: number; decidingOver3Days: number; invoicesOverdue: number; passportsMissingSoon: number };
export type Leak = { key: string; label: string; count: number; rate: number | null; fix: string };
export function leakReport(x: LeakInput): Leak[] {
  const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  const leaks: Leak[] = [
    { key: "view_to_start", label: "Viewed a tour but never started booking", count: Math.max(0, x.tourViews - x.startedBooking), rate: rate(x.startedBooking, x.tourViews), fix: "Make the price, dates and WhatsApp button easier to see on tour pages." },
    { key: "start_to_checkout", label: "Started booking but didn't reach checkout", count: Math.max(0, x.startedBooking - x.checkout), rate: rate(x.checkout, x.startedBooking), fix: "Shorten step 1, or offer the AI planner / WhatsApp at that step." },
    { key: "checkout_to_booked", label: "Reached checkout but didn't book", count: Math.max(0, x.checkout - x.purchases), rate: rate(x.purchases, x.checkout), fix: "Contact the abandoned checkouts in Inquiries the same day." },
    { key: "abandoned", label: "Abandoned checkouts waiting in Inquiries", count: x.abandoned, rate: null, fix: "Send each one a short, friendly WhatsApp." },
    { key: "unanswered", label: "Inquiries not answered within a day", count: x.inquiriesUnanswered, rate: null, fix: "Reply to new inquiries within a few hours." },
    { key: "deciding", label: "Waiting for decision for more than 3 days", count: x.decidingOver3Days, rate: null, fix: "Follow up with the ready WhatsApp message in each order." },
    { key: "overdue", label: "Invoices past their payment date", count: x.invoicesOverdue, rate: null, fix: "Send a payment reminder with the payment link." },
    { key: "passports", label: "Trips within 14 days still missing passports", count: x.passportsMissingSoon, rate: null, fix: "Ask for passports from the order (What we need from the customer)." },
  ];
  return leaks.filter((l) => l.count > 0).sort((a, b) => b.count - a.count);
}
