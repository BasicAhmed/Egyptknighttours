// ---------- Meta (Facebook) Pixel ----------
// Measures visits and bookings from Meta ads. It only runs after the visitor accepts marketing cookies (the privacy policy
// promises this), and never on private pages: a booking link carries a secret token that must not be sent to anyone.
// No server code here: the pixel, the event helper and the unit tests use this file.

export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim() || "1667158854968793";
export const CONSENT_KEY = "ek.consent.marketing"; // "yes" | "no", per browser
export const CONSENT_EVENT = "ek:cookie-settings"; // opens the cookie choice again (footer link)

// Staff panel, guide sheets, booking pages reached by private link, tracking, reviews, documents: never tracked.
const PRIVATE = ["/admin", "/guide", "/booking", "/track", "/review", "/api"];
export const pixelAllowedPath = (path: string) => !PRIVATE.some((p) => path === p || path.startsWith(p + "/"));

// The site's own events (see Tracker.track) and the Meta standard event each one is. Others are not sent to Meta.
type Extra = { tourSlug?: string; props?: Record<string, string | number | boolean> };
export function metaEventFor(name: string, extra: Extra = {}): { event: string; params: Record<string, unknown> } | null {
  const product = extra.tourSlug ? { content_ids: [extra.tourSlug], content_type: "product" } : {};
  switch (name) {
    case "view_tour": return { event: "ViewContent", params: product };
    case "start_booking": return { event: "AddToCart", params: product };
    case "start_checkout": return { event: "InitiateCheckout", params: product };
    case "purchase": { const value = Number(extra.props?.value); return { event: "Purchase", params: { ...product, currency: "USD", ...(Number.isFinite(value) && value > 0 ? { value } : { value: 0 }) } }; }
    case "whatsapp_click": return { event: "Contact", params: product };
    case "contact_form": case "custom_trip_complete": return { event: "Lead", params: {} };
    default: return null;
  }
}

type Fbq = ((...a: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
// Sends one event, only when the pixel was allowed to load on this page. Never throws.
export function sendMetaEvent(name: string, extra: Extra = {}) {
  try {
    const fbq = (window as unknown as { fbq?: Fbq }).fbq; if (!fbq || !pixelAllowedPath(location.pathname)) return;
    const e = metaEventFor(name, extra); if (e) fbq("track", e.event, e.params);
  } catch { /* measuring is never allowed to break the page */ }
}
