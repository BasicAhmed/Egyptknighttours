"use client";
export default function PrintButton() { return <button type="button" onClick={() => window.print()} className="btn !min-h-[44px] !border !border-white/30 !text-white print:hidden">Print or save as PDF</button>; }
