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
const r2 = (n: number) => Math.round(n * 100) / 100;

export function calculateQuote(i: QuoteInput): Quote {
  const t = i.tour;
  const unit = t.discountPrice ?? t.price;
  const lines: Quote["lines"] = [];
  let base: number;
  if (t.pricingModel === "PER_GROUP") {
    base = unit;
    lines.push({ label: `Tour (up to ${t.maxTravelers} travelers)`, amount: r2(base) });
  } else {
    const adultsAmt = unit * i.adults;
    const childAmt = unit * (t.childPercent / 100) * i.children;
    base = adultsAmt + childAmt;
    lines.push({ label: `${i.adults} adult${i.adults === 1 ? "" : "s"} × ${unit}`, amount: r2(adultsAmt) });
    if (i.children > 0) lines.push({ label: `${i.children} child${i.children === 1 ? "" : "ren"} × ${r2(unit * t.childPercent / 100)}`, amount: r2(childAmt) });
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
