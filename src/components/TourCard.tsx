import Link from "next/link";
import { money, duration } from "@/lib/format";
import SiteImage from "./SiteImage";

type Card = { slug: string; title: string; shortDescription: string; category: string; price: number; discountPrice: number | null; durationHours: number; durationDays: number; pricingModel: string; isPrivateAvailable: boolean; isGroupAvailable: boolean; destinationName: string; destinationSlug?: string; destinationImage?: string | null; imageUrl?: string | null; rating?: { avg: number; count: number } | null };
const Clock = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>;
export default function TourCard({ t }: { t: Card }) {
  const price = t.discountPrice ?? t.price;
  const style = t.isPrivateAvailable && t.isGroupAvailable && t.pricingModel === "PER_PERSON" ? "Private or shared" : t.isPrivateAvailable ? "Private" : "Shared";
  return (
    <Link href={`/tours/${t.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-[0_2px_12px_rgba(20,16,16,.07)] transition duration-300 hover:-translate-y-1 hover:border-gold-600/60 hover:shadow-[0_22px_44px_rgba(20,16,16,.16)]">
      <div className="relative">
        <SiteImage src={t.imageUrl || t.destinationImage} alt={`${t.title}, ${t.destinationName} tour in Egypt`} destination={t.destinationSlug} className="relative aspect-[4/3]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          {t.discountPrice != null && <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-extrabold text-ink shadow">Save {Math.round((1 - t.discountPrice / t.price) * 100)}%</span>}
          {t.category === "MULTI_DAY" && <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white shadow">Package</span>}
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold shadow">{style}</span>
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold shadow"><Clock />{duration(t)}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-gold-800">{t.destinationName}</p>
        <h3 className="mt-1 font-display text-[20px] font-extrabold leading-snug">{t.title}</h3>
        <p className="mb-4 mt-1.5 line-clamp-2 text-sm text-ink/65">{t.shortDescription}</p>
        {t.rating && <p className="mt-2 text-sm font-semibold">★ {t.rating.avg.toFixed(1)} <span className="font-normal text-ink/65">({t.rating.count} reviews)</span></p>}
        <div className="mt-auto flex items-end justify-between border-t border-ink/10 pt-4">
          <div><p className="text-xs font-semibold text-ink/65">From</p><p className="flex items-baseline gap-1.5"><span className="font-display text-[28px] font-extrabold leading-none">{money(price)}</span><span className="text-sm text-ink/65">{t.pricingModel === "PER_GROUP" ? "per group" : "per person"}</span></p>{t.discountPrice != null && <s className="text-xs text-ink/65">{money(t.price)}</s>}</div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-500 text-ink transition group-hover:bg-ink group-hover:text-gold-500" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg></span>
        </div>
      </div>
    </Link>
  );
}
