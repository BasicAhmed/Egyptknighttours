import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTourBySlug } from "@/lib/queries";
import { duration } from "@/lib/format";
import BookingWizard from "@/components/BookingWizard";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };
export const metadata: Metadata = { title: "Book your tour", robots: { index: false, follow: false } };

export default async function Book({ params, searchParams }: P) {
  const d = await getTourBySlug((await params).slug);
  if (!d) notFound();
  const sp = await searchParams;
  const n = (v: string | undefined, def: number, min: number, max: number) => { const x = Number(v); return Number.isInteger(x) ? Math.min(max, Math.max(min, x)) : def; };
  const t = d.tour;
  return <BookingWizard
    tour={{ slug: t.slug, title: t.title, imageUrl: t.imageUrl, destinationSlug: d.dest.slug, destinationName: d.dest.name, pricingModel: t.pricingModel, maxTravelers: t.maxTravelers, isPrivateAvailable: t.isPrivateAvailable, isGroupAvailable: t.isGroupAvailable, pickupInfo: t.pickupInfo, cancellationPolicy: t.cancellationPolicy, durationLabel: duration(t) }}
    addons={d.addons.map((a) => ({ id: a.id, name: a.name, description: a.description, price: a.price, unit: a.unit }))}
    initial={{ date: /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : "", adults: n(sp.a, 2, 1, t.maxTravelers), children: n(sp.c, 0, 0, t.maxTravelers), infants: n(sp.i, 0, 0, 10), isPrivate: sp.p === "1" ? t.isPrivateAvailable : !t.isGroupAvailable }} />;
}
