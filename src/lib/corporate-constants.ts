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

// Each service's selling price. ITEMIZED: the price staff typed. PERCENTAGE: the service's cost plus the request's
// service percentage, so the partner sees a real price on every line. Lines are rounded to the cent and any leftover
// cent goes on the largest line, so the lines always add up to exactly the request total that totals() works out.
// No database code here: the page, the invoice and the unit tests all use it.
const cent = (n: number) => Math.round(n * 100) / 100;
export function servicePrices(services: { cost: number; price: number }[], pricingMode: string, servicePercent: number | null): number[] {
  if (pricingMode !== "PERCENTAGE") return services.map((x) => cent(x.price));
  const f = 1 + (servicePercent ?? 0) / 100;
  const lines = services.map((x) => cent(x.cost * f));
  const total = cent(cent(services.reduce((a, x) => a + x.cost, 0)) * f);
  const diff = cent(total - lines.reduce((a, x) => a + x, 0));
  if (diff !== 0 && lines.length) { const i = lines.indexOf(Math.max(...lines)); lines[i] = cent(lines[i] + diff); }
  return lines;
}
