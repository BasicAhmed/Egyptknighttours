import { db, schema as s } from "@/db";
import { eq } from "drizzle-orm";
import type { Company } from "@/pdf/types";

export const DEFAULTS: Record<string, string> = {
  "company.name": "Egypt Knight Tours", "company.email": "info@egyptknight.com", "company.phone": "+2 01001339220", "company.whatsapp": "+2 01128348803",
  "company.address": "", "company.website": "egyptknight.com", "company.licence": "", "company.signatureName": "", "company.signatureTitle": "",
  "site.years": "10", "site.tours": "5,000", "site.reviews": "500", "site.tripadvisorUrl": "",
  "site.instagram": "", "site.facebook": "", "site.tiktok": "", "site.youtube": "",
  "site.heroImage": "", "site.videoUrl": "https://youtu.be/uz23AE-oemU", "site.videoStart": "14",
  "site.mapQuery": "Aswan, Egypt", "site.mapLink": "", "site.hours": "Every day, 9am to 9pm Egypt time",
  "invoice.depositDeadlineDays": "3", "invoice.balanceDaysBefore": "21",
  "invoice.paymentTerms": "A 50% deposit is required to confirm the reservation.\nThe remaining balance is due 21 days before arrival, or in cash on arrival where agreed.",
  "invoice.documents": "A clear copy of each guest's passport.\nA copy of your payment receipt.\nYour arrival flight details.",
  "invoice.cancellation": "More than 30 days before the travel date: free cancellation (excluding non-refundable bank charges already incurred).\n29–15 days before arrival: 50% of the total booking amount is charged.\n14–7 days before arrival: 75% of the total booking amount is charged.\nLess than 7 days before arrival, no-show or early departure: 100% is charged.\nAny bank transfer or refund fees are deducted from a refunded amount.",
  "invoice.note": "All bank transfer fees must be covered by the sender so the full amount is received.",
};
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(s.settings);
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}
export async function saveSettings(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULTS)) continue;
    const ex = await db.select().from(s.settings).where(eq(s.settings.key, key));
    if (ex.length) await db.update(s.settings).set({ value }).where(eq(s.settings.key, key)); else await db.insert(s.settings).values({ key, value });
  }
}
export const companyFrom = (g: Record<string, string>): Company => ({ name: g["company.name"], email: g["company.email"], phone: g["company.phone"], phone2: "", whatsapp: g["company.whatsapp"], address: g["company.address"], website: g["company.website"], licence: g["company.licence"], signatureName: g["company.signatureName"], signatureTitle: g["company.signatureTitle"] });
