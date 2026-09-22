"use client";
import { useState } from "react";
// Price is calculated as cost + profit margin, or entered manually as before. In margin mode the calculated price shown here is
// a preview only: the server always recalculates it on save, so it can never be tampered with or drift from what staff entered.
export default function TourPricingFields({ priceMode, price, discountPrice, costPrice, marginPercent }: { priceMode: string; price?: number | null; discountPrice?: number | null; costPrice?: number | null; marginPercent?: number | null }) {
  const [mode, setMode] = useState(priceMode === "MARGIN" ? "MARGIN" : "MANUAL");
  const [cost, setCost] = useState(costPrice ?? "");
  const [margin, setMargin] = useState(marginPercent ?? "");
  const calc = cost !== "" && margin !== "" && Number(cost) >= 0 && Number(margin) >= 0 ? Math.round(Number(cost) * (1 + Number(margin) / 100) * 100) / 100 : null;
  return (
    <>
      <div className="sm:col-span-2">
        <span className="label">How this tour is priced</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Pricing method">
          <button type="button" role="radio" aria-checked={mode === "MANUAL"} onClick={() => setMode("MANUAL")} className={`btn !min-h-[42px] !py-2 !text-[14px] ${mode === "MANUAL" ? "btn-dark" : "btn-outline"}`}>Manual price</button>
          <button type="button" role="radio" aria-checked={mode === "MARGIN"} onClick={() => setMode("MARGIN")} className={`btn !min-h-[42px] !py-2 !text-[14px] ${mode === "MARGIN" ? "btn-dark" : "btn-outline"}`}>Cost + profit %</button>
        </div>
        <input type="hidden" name="priceMode" value={mode} />
      </div>
      {mode === "MANUAL"
        ? <div><label className="label" htmlFor="tf-price">Price (USD)</label><input id="tf-price" name="price" type="number" step="any" defaultValue={price ?? ""} className="input" /></div>
        : <div><label className="label" htmlFor="tf-cost">Cost of the program (USD, no profit)</label><input id="tf-cost" name="costPrice" type="number" step="any" min={0} value={cost} onChange={(e) => setCost(e.target.value)} className="input" placeholder="e.g. hotel, guide, driver, entrance fees" /></div>}
      {mode === "MANUAL"
        ? <div><label className="label" htmlFor="tf-discount">Discount price (optional)</label><input id="tf-discount" name="discountPrice" type="number" step="any" defaultValue={discountPrice ?? ""} className="input" /></div>
        : <div><label className="label" htmlFor="tf-margin">Profit margin (%)</label><input id="tf-margin" name="marginPercent" type="number" step="any" min={0} value={margin} onChange={(e) => setMargin(e.target.value)} className="input" /></div>}
      {mode === "MARGIN" && <>
        <div className="sm:col-span-2 rounded-xl border border-gold-600/40 bg-gold-500/10 p-3 text-sm">
          <span className="font-semibold">List price shown to customers: </span>{calc != null ? `$${calc.toFixed(2)} per person` : "Enter a cost and a profit % to see it"}
        </div>
        <div className="sm:col-span-2"><label className="label" htmlFor="tf-discount2">Discount price (optional, shown instead of the calculated price when set)</label><input id="tf-discount2" name="discountPrice" type="number" step="any" defaultValue={discountPrice ?? ""} className="input" /></div>
      </>}
    </>
  );
}
