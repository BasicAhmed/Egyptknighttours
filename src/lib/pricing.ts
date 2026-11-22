export type PriceTour = {
  pricingModel: string; price: number; discountPrice: number | null; childPercent: number;
  privateSurcharge: number; maxTravelers: number; isPrivateAvailable: boolean; isGroupAvailable: boolean;
};
export type PriceAddon = { id: string; price: number; unit: string };
export type PriceCoupon = { type: string; value: number; minSubtotal: number } | null;
export type QuoteInput = {
  tour: PriceTour; adults: number; children: number; infants: number; isPrivate: boolean;
  addons: PriceAddon[]; coupon: PriceCoupon; payMode: "DEPOSIT" | "FULL" | "PAY_LATER";
};
export type Quote = {
  unitPrice: number; base: number; privateExtra: number; addonsTotal: number;
  subtotal: number; discount: number; total: number; deposit: number; dueLater: number;
  lines: { label: string; amount: number }[];
};
export const DEPOSIT_PERCENT = 50;
export const r2 = (n: number) => Math.round(n * 100) / 100;

// The base tour amount for a unit price under a tour's pricing rules (per person with a discounted child rate, or a flat per-group price).
// Used both for the price customers pay and, with the tour's cost instead of its price, for the cost snapshot behind profit reporting.
export function tourBaseAmount(unit: number, pricingModel: string, adults: number, children: number, childPercent: number): number {
  if (pricingModel === "PER_GROUP") return r2(unit);
  return r2(unit * adults + unit * (childPercent / 100) * children);
}

// The list price shown to customers when a tour is priced as cost + profit margin.
export function calcSellPrice(costPrice: number, marginPercent: number): number { return r2(costPrice * (1 + marginPercent / 100)); }

export function calculateQuote(i: QuoteInput): Quote {
  const t = i.tour;
  const unit = t.discountPrice ?? t.price;
  const lines: Quote["lines"] = [];
  const base = tourBaseAmount(unit, t.pricingModel, i.adults, i.children, t.childPercent);
  if (t.pricingModel === "PER_GROUP") {
    lines.push({ label: `Tour (up to ${t.maxTravelers} travelers)`, amount: base });
  } else {
    lines.push({ label: `${i.adults} adult${i.adults === 1 ? "" : "s"} × ${unit}`, amount: r2(unit * i.adults) });
    if (i.children > 0) lines.push({ label: `${i.children} child${i.children === 1 ? "" : "ren"} × ${r2(unit * t.childPercent / 100)}`, amount: r2(unit * (t.childPercent / 100) * i.children) });
    if (i.infants > 0) lines.push({ label: `${i.infants} infant${i.infants === 1 ? "" : "s"} (free)`, amount: 0 });
  }
  const privateExtra = i.isPrivate ? t.privateSurcharge : 0;
  if (privateExtra > 0) lines.push({ label: "Private tour upgrade", amount: r2(privateExtra) });
  const people = i.adults + i.children;
  let addonsTotal = 0;
  for (const a of i.addons) {
    const amt = a.unit === "PER_PERSON" ? a.price * people : a.price;
    addonsTotal += amt;
    lines.push({ label: `Add-on (${a.unit === "PER_PERSON" ? "per person" : "per booking"})`, amount: r2(amt) });
  }
  const subtotal = r2(base + privateExtra + addonsTotal);
  let discount = 0;
  if (i.coupon && subtotal >= i.coupon.minSubtotal) {
    discount = i.coupon.type === "PERCENT" ? subtotal * (i.coupon.value / 100) : i.coupon.value;
    discount = r2(Math.min(discount, subtotal));
    if (discount > 0) lines.push({ label: "Discount", amount: -discount });
  }
  const total = r2(subtotal - discount);
  const deposit = i.payMode === "FULL" ? total : i.payMode === "PAY_LATER" ? 0 : r2(total * DEPOSIT_PERCENT / 100);
  return { unitPrice: unit, base: r2(base), privateExtra: r2(privateExtra), addonsTotal: r2(addonsTotal), subtotal, discount, total, deposit, dueLater: r2(total - deposit), lines };
}

// ---------- An itinerary's price: per adult, and optionally a different price per child ----------
// Staff enter the cost per adult, an optional cost per child (blank = same as an adult) and one profit margin. The order's
// total is adults × adult price + children × child price. Infants travel free. The lines are what the invoice prints,
// so the customer sees exactly how the total is made ("2 adults × €600", "2 children × €550").
export type PriceLine = { label: string; qty: number; unit: number; amount: number };
export function itineraryPrice(o: { cost: number; childCost?: number | null; margin: number; adults: number; children: number; fmt: (n: number) => string }) {
  const adults = Math.max(0, Math.floor(o.adults)), children = Math.max(0, Math.floor(o.children));
  const adultPrice = calcSellPrice(o.cost, o.margin);
  const childSet = o.childCost != null && Number.isFinite(o.childCost) && o.childCost >= 0;
  const childCost = childSet ? o.childCost! : o.cost;
  const childPrice = calcSellPrice(childCost, o.margin);
  const split = childSet && children > 0 && Math.abs(childPrice - adultPrice) > 0.005; // only worth two lines when they differ
  const lines: PriceLine[] = [];
  if (split) {
    if (adults > 0) lines.push({ label: `${adults} adult${adults === 1 ? "" : "s"} × ${o.fmt(adultPrice)}`, qty: adults, unit: adultPrice, amount: r2(adultPrice * adults) });
    lines.push({ label: `${children} child${children === 1 ? "" : "ren"} × ${o.fmt(childPrice)}`, qty: children, unit: childPrice, amount: r2(childPrice * children) });
  } else {
    const n = Math.max(1, adults + children);
    lines.push({ label: `${n} traveler${n === 1 ? "" : "s"} × ${o.fmt(adultPrice)}`, qty: n, unit: adultPrice, amount: r2(adultPrice * n) });
  }
  const total = r2(lines.reduce((a, l) => a + l.amount, 0));
  const costTotal = split ? r2(o.cost * adults + childCost * children) : r2(o.cost * Math.max(1, adults + children));
  const perPerson = split ? `${o.fmt(adultPrice)} per adult, ${o.fmt(childPrice)} per child` : `${o.fmt(adultPrice)} per person`;
  return { adultPrice, childPrice: split ? childPrice : adultPrice, split, lines, total, costTotal, perPerson };
}

// The trip's own lines. When a priced itinerary set how the total is made ("2 adults × €600", "2 children × €550"), the
// invoice prints those lines, so the customer sees the adult and child prices. Used only while they still add up to the
// trip amount and the same number of people: if the order was repriced, or travelers were added, some other way since, the
// invoice falls back to one line, so it is never wrong.
export function tripLines(title: string, travelers: string, tourAmount: number, saved: string | null | undefined, people?: { adults: number; children: number }): { label: string; amount: number }[] {
  let lines: { label?: unknown; amount?: unknown; qty?: unknown }[] = []; try { const v = JSON.parse(saved ?? ""); if (Array.isArray(v)) lines = v; } catch { lines = []; }
  const ok = lines.length > 0 && lines.every((l) => typeof l?.label === "string" && Number.isFinite(Number(l?.amount)));
  const counted = ok ? lines.reduce((a, l) => a + (Number(l.qty) || 0), 0) : 0;
  const samePeople = !people || counted === Math.max(1, people.adults + people.children);
  if (ok && samePeople && Math.abs(lines.reduce((a, l) => a + Number(l.amount), 0) - tourAmount) < 0.01)
    return lines.map((l) => ({ label: `${title}: ${String(l.label)}`, amount: r2(Number(l.amount)) }));
  return [{ label: `${title} (${travelers})`, amount: tourAmount }];
}
