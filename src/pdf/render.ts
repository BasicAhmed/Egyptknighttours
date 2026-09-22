import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import InvoicePdf from "./InvoicePdf";
import ItineraryPdf from "./ItineraryPdf";
import FinanceReportPdf from "./FinanceReportPdf";
import type { InvoiceData, ItineraryPdfData, FinanceReportData } from "./types";

// The embedded fonts cover Latin text. Swap arrows and strip emoji so nothing renders as a broken glyph.
export function pdfSafe<T>(v: T): T {
  if (typeof v === "string") return v.replace(/→/g, "to").replace(/←/g, "from").replace(/[★☆]/g, "*").replace(/[\u2713\u2714]/g, "").replace(/\p{Extended_Pictographic}/gu, "").replace(/\uFE0F|\u200B/g, "") as T;
  if (Array.isArray(v)) return v.map(pdfSafe) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, pdfSafe(x)])) as T;
  return v;
}
export async function renderInvoice(d: InvoiceData): Promise<Buffer> {
  return renderToBuffer(React.createElement(InvoicePdf, { d: pdfSafe(d) }) as never);
}

export async function renderItinerary(d: ItineraryPdfData): Promise<Buffer> {
  return renderToBuffer(React.createElement(ItineraryPdf, { d: { ...pdfSafe({ ...d, images: {} }), images: d.images } }) as never);
}

export async function renderFinanceReport(d: FinanceReportData): Promise<Buffer> {
  return renderToBuffer(React.createElement(FinanceReportPdf, { d: pdfSafe(d) }) as never);
}
