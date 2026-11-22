// What Egypt Knight asks The Royal Nile Residence for, through the private link (see link.ts). Server-only.
import { callLink, linkReady } from "./link";

export const rnUrl = () => (process.env.ROYAL_NILE_URL ?? "").trim();
export const rnReady = () => linkReady(rnUrl());

export type RnAvailability = { today: string; taken: string[]; nightlyUsd: number; cleaningUsd: number; maxGuests: number; checkInTime: string; checkOutTime: string; address: string; whatsapp: string };
export type RnBooking = { ref: string; checkIn: string; checkOut: string; nights: number; guests: number; name: string; status: string; statusLabel: string; totalUsd: number; paidUsd: number; partnerRef: string };

export const rnAvailability = () => callLink<RnAvailability>(rnUrl(), "GET", "/api/link/availability");
export const rnBookings = () => callLink<{ bookings: RnBooking[] }>(rnUrl(), "GET", "/api/link/bookings");
export const rnBook = (body: Record<string, unknown>) => callLink<{ ok: true; ref: string; statusLabel: string; nights: number; totalUsd: number }>(rnUrl(), "POST", "/api/link/bookings", body);
