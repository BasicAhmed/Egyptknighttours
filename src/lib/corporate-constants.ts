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
