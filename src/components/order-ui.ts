import type { Order, OrderRow } from "@/lib/orders";

export type Stage = "NEW" | "DECIDING" | "AWAITING" | "PARTIAL" | "PAID" | "DONE" | "CANCELLED";
const STAGE: Record<string, Stage> = { INQUIRY: "NEW", PENDING: "NEW", CONFIRMED: "NEW", QUOTE_SENT: "DECIDING", ITINERARY_SENT: "DECIDING", INVOICED: "AWAITING", PARTIALLY_PAID: "PARTIAL", DEPOSIT_PAID: "PARTIAL", PAID: "PAID", COMPLETED: "DONE", CANCELLED: "CANCELLED" };
export const stageOf = (st: string): Stage => STAGE[st] ?? "NEW";
export const STATUS_LABEL: Record<string, string> = { INQUIRY: "Inquiry", QUOTE_SENT: "Quote sent", ITINERARY_SENT: "Waiting for decision", PENDING: "New order", CONFIRMED: "Confirmed", INVOICED: "Awaiting payment", PARTIALLY_PAID: "Partly paid", DEPOSIT_PAID: "Deposit paid", PAID: "Paid / confirmed", COMPLETED: "Completed", CANCELLED: "Cancelled" };
export const STATUS_OPTIONS = ["INQUIRY", "PENDING", "ITINERARY_SENT", "QUOTE_SENT", "INVOICED", "PARTIALLY_PAID", "PAID", "COMPLETED", "CANCELLED"];
export const PILL: Record<Stage, string> = { NEW: "bg-gold-500/25 text-[#6B4A0C]", DECIDING: "bg-[#DCEFF1] text-[#14545B]", AWAITING: "bg-[#FDE9D3] text-[#8A4B0A]", PARTIAL: "bg-[#E3EEFB] text-[#1D4E89]", PAID: "bg-[#DFF3E6] text-[#17663A]", DONE: "bg-ink/10 text-ink/70", CANCELLED: "bg-red-100 text-red-800" };
// The colour of each stage on the order list (the edge of the date stub and the stage counters).
export const STAGE_COLOR: Record<Stage, string> = { NEW: "#F0B050", DECIDING: "#1F6F78", AWAITING: "#D9772B", PARTIAL: "#2F6FB5", PAID: "#1F8A4C", DONE: "#B9B3A8", CANCELLED: "#C0392B" };
export const money = (n: number, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const shortDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
export const ago = (ms: number) => { const m = Math.round((Date.now() - ms) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); if (h < 24) return `${h}h ago`; const d = Math.round(h / 24); return d < 30 ? `${d}d ago` : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
export const daysUntil = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
export const waUrl = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

export type Focus = "invoice" | "payment" | "itinerary";
export type Next = { label: string; focus: Focus; href?: string } | null;
export const SOURCE_LABEL: Record<string, string> = { WEBSITE: "Website", WHATSAPP: "WhatsApp", EMAIL: "Email", PHONE: "Phone", VIATOR: "Viator" };
// The single most useful thing to do next for an order, so staff never have to think about the process.
export function nextStep(r: Pick<OrderRow, "status" | "invoices" | "itineraries" | "itinerarySent" | "total" | "id">): Next {
  const st = stageOf(r.status);
  // No price yet: the next real step is to build the itinerary that sets it, not to create a $0 invoice.
  if (st === "NEW" && r.total === 0 && r.itineraries === 0) return { label: "Price it", focus: "invoice", href: `/admin/itineraries/new?bookingId=${r.id}` };
  if (st === "NEW") return { label: r.invoices ? "Send invoice" : "Create invoice", focus: "invoice" };
  // Waiting for the customer: once they say yes, the invoice is the next step (it moves the order on by itself).
  if (st === "DECIDING") return { label: r.invoices ? "Send invoice" : "They said yes: invoice", focus: "invoice" };
  if (st === "AWAITING" || st === "PARTIAL") return { label: "Record payment", focus: "payment" };
  if (st === "PAID") return r.itineraries === 0 ? { label: "Create itinerary", focus: "itinerary" } : r.itinerarySent === 0 ? { label: "Send itinerary", focus: "itinerary" } : null;
  return null;
}
export const rowFromOrder = (o: Order): OrderRow => ({ id: o.id, ref: o.ref, status: o.status, title: o.title, name: o.customer.name, email: o.customer.email, whatsapp: o.customer.whatsapp || o.customer.phone, country: o.customer.country, travelDate: o.travelDate, pax: o.adults + o.children + o.infants, isPrivate: o.isPrivate, source: o.source || "WEBSITE", total: o.total, paid: o.paid, currency: o.currency, createdAt: o.createdAt, invoices: o.documents.filter((d) => d.kind === "INVOICE").length, invoiceSent: o.documents.filter((d) => d.kind === "INVOICE" && d.sentAt).length, itineraries: o.documents.filter((d) => d.kind === "ITINERARY").length + o.itineraries.length, itinerarySent: o.documents.filter((d) => d.kind === "ITINERARY" && d.sentAt).length, itinerarySentAt: Math.max(0, ...o.documents.filter((d) => d.kind === "ITINERARY" && d.sentAt).map((d) => d.sentAt as number)) || null, toCheck: o.customerUploads.filter((u) => u.status === "PENDING").length, hotel: o.hotel, guideName: o.guides.find((g) => g.id === o.ops.guideId)?.name ?? "", passports: o.travelers.filter((t) => t.files.some((f) => f.kind === "PASSPORT")).length });
