// ---------- Files the customer uploads for a request ----------
// The loop: we ask (customer-requests.ts) → the customer uploads on their booking page → staff check it → confirm or
// reject with a reason. Confirmed passports go into the traveler's Passport section; a confirmed payment receipt records
// the payment; a confirmed file closes its note. No database code here: the booking page, the upload API, the order
// window and the unit tests all use these rules.

export const MAX_UPLOAD_BYTES = 4_000_000; // request bodies on Vercel are limited to about 4.5 MB
export const UPLOAD_KINDS = ["PASSPORT", "PAYMENT_PROOF", "FILE"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];
export const UPLOAD_KIND_LABEL: Record<UploadKind, string> = { PASSPORT: "Passport", PAYMENT_PROOF: "Payment receipt", FILE: "File" };
export const MAX_PENDING_PER_BOOKING = 30; // a booking page can't be used to fill the database

// Which upload a request takes: a passport per traveler, a receipt for the balance, a file for a note that asks for one.
export function uploadKindFor(r: { kind: string; needsUpload?: boolean | null }): UploadKind | null {
  if (r.kind === "PASSPORTS") return "PASSPORT";
  if (r.kind === "BALANCE") return "PAYMENT_PROOF";
  return r.needsUpload ? "FILE" : null;
}

export type UploadRow = { id: string; requestId: string | null; travelerId: string | null; kind: string; status: string; rejectReason: string | null; createdAt: number };
export type TravelerRow = { id: string; name: string; hasPassport: boolean };
// Where one traveler's passport stands, as the customer reads it.
export type PassportState = { travelerId: string; name: string; state: "RECEIVED" | "CHECKING" | "REJECTED" | "NEEDED"; reason: string };

// Latest upload wins: a new upload after a rejection replaces the rejection.
const latest = (rows: UploadRow[]) => [...rows].sort((a, b) => b.createdAt - a.createdAt)[0];

export function passportStates(travelers: TravelerRow[], uploads: UploadRow[]): PassportState[] {
  return travelers.map((t) => {
    if (t.hasPassport) return { travelerId: t.id, name: t.name, state: "RECEIVED", reason: "" };
    const u = latest(uploads.filter((x) => x.kind === "PASSPORT" && x.travelerId === t.id));
    if (u?.status === "PENDING") return { travelerId: t.id, name: t.name, state: "CHECKING", reason: "" };
    if (u?.status === "REJECTED") return { travelerId: t.id, name: t.name, state: "REJECTED", reason: u.rejectReason ?? "" };
    return { travelerId: t.id, name: t.name, state: "NEEDED", reason: "" };
  });
}
// Every traveler's passport is in the Passport section: the passport request is complete.
export const passportsComplete = (travelers: TravelerRow[]) => travelers.length > 0 && travelers.every((t) => t.hasPassport);

// Where a single-file request (receipt or file) stands for the customer.
export function singleUploadState(requestId: string, uploads: UploadRow[]): { state: "CHECKING" | "REJECTED" | "NEEDED"; reason: string } {
  const u = latest(uploads.filter((x) => x.requestId === requestId && x.kind !== "PASSPORT" && x.status !== "APPROVED"));
  if (u?.status === "PENDING") return { state: "CHECKING", reason: "" };
  if (u?.status === "REJECTED") return { state: "REJECTED", reason: u.rejectReason ?? "" };
  return { state: "NEEDED", reason: "" };
}

// What a customer may upload, checked before anything is stored. Returns the reason in plain words, or "".
export function uploadProblem(o: { size: number; mime: string | null; requestOpen: boolean; kind: UploadKind | null; travelerOk: boolean; pending: number; cancelled: boolean }): string {
  if (o.cancelled) return "This booking was cancelled. Please message us.";
  if (!o.requestOpen || !o.kind) return "We don't need this any more. Please refresh the page.";
  if (o.kind === "PASSPORT" && !o.travelerOk) return "Choose the traveler this passport belongs to.";
  if (o.pending >= MAX_PENDING_PER_BOOKING) return "We have a lot of files waiting to be checked. Please message us on WhatsApp.";
  if (!(o.size > 0)) return "That file is empty. Please choose it again.";
  if (o.size > MAX_UPLOAD_BYTES) return `That file is ${(o.size / 1e6).toFixed(1)} MB. Please send one under 4 MB, or a photo instead.`;
  if (!o.mime) return "Please upload a photo (JPG, PNG, WebP) or a PDF.";
  return "";
}

// Staff reject with a short reason the customer will read ("The photo is blurry", "Passport expires before the trip").
export function parseRejectReason(raw: unknown): { ok: true; reason: string } | { ok: false; message: string } {
  const r = String(raw ?? "").trim();
  if (r.length < 3) return { ok: false, message: "Write a short reason the customer will read, e.g. \"The photo is blurry\"." };
  if (r.length > 300) return { ok: false, message: "Keep the reason under 300 characters." };
  return { ok: true, reason: r };
}
// The amount staff confirm for a receipt. Must be above zero and not more than what is still to pay.
export function parseReceiptAmount(raw: unknown, balance: number): { ok: true; amount: number } | { ok: false; message: string } {
  const n = Math.round(Number(String(raw ?? "").replace(/,/g, "")) * 100) / 100;
  if (!(n > 0)) return { ok: false, message: "Enter the amount you received (above zero)." };
  if (n > balance + 0.005) return { ok: false, message: `That's more than the ${balance} still to pay. Check the amount.` };
  return { ok: true, amount: n };
}
