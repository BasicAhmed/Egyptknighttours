// ---------- What we need from the customer ----------
// Staff list what a customer still has to send or do: passport copies, the remaining balance by a date, or anything else
// written as a note. Each can be marked important. The customer sees the open ones at the top of their booking page, and
// staff can email them the list. No database code here: the order window, the booking page, the email and the unit tests
// all use this file, so they always say the same thing.

export const REQUEST_KINDS = ["PASSPORTS", "BALANCE", "NOTE"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];
export const REQUEST_KIND_LABEL: Record<RequestKind, string> = { PASSPORTS: "Passport copies", BALANCE: "Remaining balance", NOTE: "Note" };

export type CustomerRequest = { id: string; kind: string; text: string; important: boolean; dueDate: string | null; status: string; createdAt: number };
export type RequestContext = { balance: number; currency: string; travelDate: string; travelers: number; ref: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const day = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const money = (n: number, c: string) => { try { return new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD", minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n); } catch { return `${c} ${n}`; } };
export const daysBetween = (from: string, to: string) => Math.round((new Date(to + "T00:00:00Z").getTime() - new Date(from + "T00:00:00Z").getTime()) / 86400000);
export const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// The usual balance date: the set number of days before travel (Settings: invoice.balanceDaysBefore, 21 by default).
export const defaultBalanceDue = (travelDate: string, daysBefore: number) => (ISO.test(travelDate) ? addDays(travelDate, -Math.max(0, Math.round(daysBefore || 21))) : null);

// What the customer reads for one request: a short title and one or two plain sentences.
export function requestText(r: Pick<CustomerRequest, "kind" | "text" | "dueDate">, c: RequestContext): { title: string; detail: string } {
  const by = r.dueDate && ISO.test(r.dueDate) ? day(r.dueDate) : "";
  const before = r.dueDate && ISO.test(r.dueDate) && ISO.test(c.travelDate) ? daysBetween(r.dueDate, c.travelDate) : null;
  const extra = r.text.trim();
  if (r.kind === "PASSPORTS") return {
    title: "Passport copies",
    detail: [`Please send a clear photo of the passport photo page for ${c.travelers > 1 ? `each of the ${c.travelers} travelers` : "the traveler"}${by ? ` by ${by}` : ""}. Reply to our email or send them on WhatsApp.`, extra].filter(Boolean).join(" "),
  };
  if (r.kind === "BALANCE") return {
    title: `Remaining balance: ${money(c.balance, c.currency)}`,
    detail: [`Please pay ${money(c.balance, c.currency)}${by ? ` by ${by}` : ""}${before != null && before > 0 ? ` (${before} days before your trip)` : ""}. Use your booking ID ${c.ref} as the payment reference.`, extra].filter(Boolean).join(" "),
  };
  const [first, ...rest] = extra.split("\n");
  return { title: first.trim() || "Note from our team", detail: [rest.join("\n").trim(), by ? `Please by ${by}.` : ""].filter(Boolean).join(" ") };
}

// The requests the customer still has to act on, important ones first, then by due date. A balance request goes away by
// itself once nothing is left to pay, so the page never asks for money already received.
export function openRequests<T extends Pick<CustomerRequest, "kind" | "status" | "important" | "dueDate" | "createdAt">>(list: T[], balance: number): T[] {
  return list.filter((r) => r.status === "OPEN" && !(r.kind === "BALANCE" && balance <= 0.005))
    .sort((a, b) => Number(b.important) - Number(a.important) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.createdAt - b.createdAt);
}

// Checks a new request from the order window. Returns the cleaned request or the reason, in plain words.
export function parseRequest(input: { kind?: unknown; text?: unknown; important?: unknown; dueDate?: unknown }): { ok: true; value: { kind: RequestKind; text: string; important: boolean; dueDate: string | null } } | { ok: false; message: string } {
  const kind = String(input.kind ?? "") as RequestKind;
  if (!REQUEST_KINDS.includes(kind)) return { ok: false, message: "Choose what you need from the customer." };
  const text = String(input.text ?? "").trim();
  if (text.length > 1000) return { ok: false, message: "Keep the note under 1,000 characters." };
  if (kind === "NOTE" && !text) return { ok: false, message: "Write the note for the customer." };
  const due = String(input.dueDate ?? "").trim();
  if (due && !(ISO.test(due) && new Date(due + "T00:00:00Z").toISOString().slice(0, 10) === due)) return { ok: false, message: "Choose a real date, or leave it empty." };
  return { ok: true, value: { kind, text, important: input.important === true || input.important === "on" || input.important === "true", dueDate: due || null } };
}
