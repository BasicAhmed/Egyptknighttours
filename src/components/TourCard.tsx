import Link from "next/link";
import { money, duration } from "@/lib/format";
import SiteImage from "./SiteImage";

type Card = { slug: string; title: string; shortDescription: string; category: string; price: number; discountPrice: number | null; durationHours: number; durationDays: number; pricingModel: string; isPrivateAvailable: boolean; isGroupAvailable: boolean; destinationName: string; destinationSlug?: string; imageUrl?: string | null; rating?: { avg: number; count: number } | null };
export default function TourCard({ t }: { t: Card }) {
  const price = t.discountPrice ?? t.price;
  const style = t.isPrivateAvailable && t.isGroupAvailable && t.pricingModel === "PER_PERSON" ? "Private or shared" : t.isPrivateAvailable ? "Private" : "Shared";
  return (
    <Link href={`/tours/${t.slug}`} className="group block">
      <div className="relative">
        <SiteImage src={t.imageUrl} alt={t.title} destination={t.destinationSlug} className="relative aspect-[4/3] rounded-2xl" />
        {t.category === "MULTI_DAY" && <span className="absolute left-3 top-3 rounded-md bg-ink px-2 py-1 text-xs font-semibold text-white">Package</span>}
        {t.discountPrice != null && <span className="absolute left-3 top-3 rounded-md bg-gold-500 px-2 py-1 text-xs font-bold text-ink">Save {Math.round((1 - t.discountPrice / t.price) * 100)}%</span>}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink/55">{t.destinationName} · {duration(t)} · {style}</p>
      <h3 className="mt-1 font-display text-[19px] font-bold leading-snug group-hover:underline group-hover:decoration-gold-500 group-hover:decoration-2 group-hover:underline-offset-4">{t.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink/65">{t.shortDescription}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        {t.rating && <span className="mr-1 text-sm font-semibold">★ {t.rating.avg.toFixed(1)} <span className="font-normal text-ink/50">({t.rating.count})</span></span>}
        <span className="text-sm text-ink/60">From</span><b className="text-lg">{money(price)}</b><span className="text-sm text-ink/60">{t.pricingModel === "PER_GROUP" ? "per group" : "per person"}</span>
        {t.discountPrice != null && <s className="text-sm text-ink/40">{money(t.price)}</s>}
      </div>
    </Link>
  );
}
