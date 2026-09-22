"use client";
import { useState } from "react";
// Every tour is priced as cost + profit margin — there is no manual price. The price shown here is a live preview only:
// the server always recalculates it on save, so it can never be tampered with or drift from what staff entered.
export default function TourPricingFields({ discountPrice, costPrice, marginPercent }: { discountPrice?: number | null; costPrice?: number | null; marginPercent?: number | null }) {
  const [cost, setCost] = useState(costPrice ?? ""); const [margin, setMargin] = useState(marginPercent ?? "");
  const calc = cost !== "" && margin !== "" && Number(cost) >= 0 && Number(margin) >= 0 ? Math.round(Number(cost) * (1 + Number(margin) / 100) * 100) / 100 : null;
  return (
    <>
      <div><label className="label" htmlFor="tf-cost">Cost of the program (USD, no profit)</label><input id="tf-cost" name="costPrice" type="number" step="any" min={0} required value={cost} onChange={(e) => setCost(e.target.value)} className="input" placeholder="hotel, guide, driver, entrance fees" /></div>
      <div><label className="label" htmlFor="tf-margin">Profit margin (%)</label><input id="tf-margin" name="marginPercent" type="number" step="any" min={0} required value={margin} onChange={(e) => setMargin(e.target.value)} className="input" /></div>
      <div className="sm:col-span-2 rounded-xl border border-gold-600/40 bg-gold-500/10 p-3 text-sm">
        <span className="font-semibold">List price shown to customers: </span>{calc != null ? `$${calc.toFixed(2)} per person` : "Enter a cost and a profit % to see it"}
      </div>
      <div className="sm:col-span-2"><label className="label" htmlFor="tf-discount">Discount price (optional, shown instead of the calculated price when set)</label><input id="tf-discount" name="discountPrice" type="number" step="any" defaultValue={discountPrice ?? ""} className="input" /></div>
    </>
  );
}
