export const SERVICE_TYPES = [
  ["TRANSFER", "Transfer"], ["ENTRANCE_TICKETS", "Entrance tickets"], ["PERMITS", "Permits"], ["FELUCCA", "Felucca"],
  ["MOTOR_BOAT", "Motor / boat"], ["TOUR_GUIDE", "Tour guide"], ["HOTEL", "Hotel"], ["NILE_CRUISE", "Nile cruise"],
  ["AIRPORT_SERVICES", "Airport services"], ["TRANSPORTATION", "Transportation"], ["OTHER", "Other"],
] as const;
export const SERVICE_TYPE_LABEL: Record<string, string> = Object.fromEntries(SERVICE_TYPES);
export const REQUEST_STATUS = ["NEW", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const REQUEST_STATUS_LABEL: Record<string, string> = { NEW: "New", CONFIRMED: "Confirmed", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled" };
export const SERVICE_STATUS = ["PENDING", "CONFIRMED", "DONE", "CANCELLED"] as const;
export const SERVICE_STATUS_LABEL: Record<string, string> = { PENDING: "Pending", CONFIRMED: "Confirmed", DONE: "Done", CANCELLED: "Cancelled" };
export const PRICING_MODES = ["ITEMIZED", "PERCENTAGE"] as const;
export const PRICING_MODE_LABEL: Record<string, string> = { ITEMIZED: "Price each service", PERCENTAGE: "Fixed percentage on the total" };

// Partner requests can be priced only in currencies that have an exchange rate in Settings (fx.*), so Finance can turn
// every partner payment into dollars. Add a currency here only together with its rate in settings.ts and the Settings page.
export const CORPORATE_CURRENCIES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"] as const;

// ---------- Money rules for a partner request ----------
// Written once here (no database code) and used by the request page, the list, the invoice, Finance and the unit tests,
// so they can never disagree. A service marked Cancelled is kept on the request for the record but is not charged:
// it adds nothing to the cost, the price or the invoice.
type Money = { cost: number; price: number; status?: string | null };
const cent = (n: number) => Math.round(n * 100) / 100;
export const isCharged = (sv: { status?: string | null }) => sv.status !== "CANCELLED";

// ITEMIZED: each service has its own price, summed. PERCENTAGE: services only carry a cost; the price is the total cost
// plus one service-fee percentage.
export function requestTotals(services: Money[], pricingMode: string, servicePercent: number | null) {
  const live = services.filter(isCharged);
  const cost = cent(live.reduce((a, x) => a + x.cost, 0));
  const price = pricingMode === "PERCENTAGE" ? cent(cost * (1 + (servicePercent ?? 0) / 100)) : cent(live.reduce((a, x) => a + x.price, 0));
  return { cost, price, profit: cent(price - cost) };
}

// Each service's selling price. ITEMIZED: the price staff typed. PERCENTAGE: the service's cost plus the percentage, so the
// partner sees a real price on every line. Cancelled services are 0. Lines are rounded to the cent and any leftover cent
// goes on the largest line, so the charged lines always add up to exactly requestTotals().price.
export function servicePrices(services: Money[], pricingMode: string, servicePercent: number | null): number[] {
  const out = services.map((x) => (!isCharged(x) ? 0 : pricingMode === "PERCENTAGE" ? cent(x.cost * (1 + (servicePercent ?? 0) / 100)) : cent(x.price)));
  if (pricingMode !== "PERCENTAGE") return out;
  const diff = cent(requestTotals(services, pricingMode, servicePercent).price - out.reduce((a, x) => a + x, 0));
  if (diff !== 0) {
    let i = -1; services.forEach((x, k) => { if (isCharged(x) && (i < 0 || out[k] > out[i])) i = k; });
    if (i >= 0) out[i] = cent(out[i] + diff);
  }
  return out;
}

// What is still owed. Negative means the partner paid more than the current total (a refund or credit is due).
export const balanceOf = (price: number, paid: number) => cent(price - paid);
export const isSettled = (price: number, paid: number) => price > 0 && balanceOf(price, paid) <= 0.005;

// Can this payment be recorded? One rule for the form and the server. Returns the reason in plain words, or "".
export function paymentProblem(o: { status: string; price: number; paid: number; amount: number; currency: string }): string {
  if (o.status === "CANCELLED") return "This request is cancelled. Set it back to another status before recording a payment.";
  if (!(o.price > 0)) return "Price the services first: there is nothing to pay yet.";
  if (!(o.amount > 0)) return "Enter a payment amount above zero.";
  const left = balanceOf(o.price, o.paid);
  if (left <= 0.005) return "This request is already paid in full.";
  if (o.amount > left + 0.005) return `That is more than the ${fmt(left, o.currency)} still due. Record ${fmt(left, o.currency)}, or update the services first.`;
  return "";
}
export const fmt = (n: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c, minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);

// History on a request: what happened, in plain words, for the team (never shown to the partner).
export const EVENT_LABEL: Record<string, string> = {
  CREATED: "Request created", UPDATED: "Details changed", STATUS: "Status changed", PRICING: "Pricing changed", CURRENCY: "Currency changed",
  SERVICE_ADDED: "Service added", SERVICE_UPDATED: "Service changed", SERVICE_REMOVED: "Service removed",
  PAYMENT_ADDED: "Payment recorded", PAYMENT_REMOVED: "Payment removed", INVOICE_NOTES: "Invoice notes changed",
};

// The business runs on Cairo time: a payment recorded at 01:00 in Cairo belongs to that Cairo day, not the previous UTC day.
export const BUSINESS_TZ = "Africa/Cairo";
export const businessDay = (d: Date | string | number) => new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d)); // YYYY-MM-DD

// Service types are stored as their code (TRANSFER, HOTEL...) when they match a known type, whatever case or wording the
// form sent ("Transfer", "transfer", "TRANSFER"), so lists, the calendar and the invoice always show one consistent name.
// Anything else is a custom service and is kept as typed.
export function normalizeServiceType(input: string): string {
  const v = input.trim(); const k = v.toLowerCase();
  const hit = SERVICE_TYPES.find(([code, label]) => code.toLowerCase() === k || label.toLowerCase() === k);
  return hit ? hit[0] : v;
}
