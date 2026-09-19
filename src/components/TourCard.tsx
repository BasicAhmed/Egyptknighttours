import Link from "next/link";
import { money, CATEGORY_LABEL, duration } from "@/lib/format";
import { parseJson } from "@/lib/format";

type Card = { slug: string; title: string; shortDescription: string; category: string; price: number; discountPrice: number | null; durationHours: number; durationDays: number; pricingModel: string; isPrivateAvailable: boolean; isGroupAvailable: boolean; highlights: string; destinationName: string; rating?: { avg: number; count: number } | null };
const GRAD: Record<string, string> = { DAY: "from-gold-500 to-gold-700", MULTI_DAY: "from-ink to-gold-700", NILE_CRUISE: "from-nile to-ink", TRANSFER: "from-gold-400 to-gold-600" };
export default function TourCard({ t }: { t: Card }) {
  const price = t.discountPrice ?? t.price;
  const hl = parseJson<string[]>(t.highlights, []).slice(0, 2);
  return (
    <Link href={`/tours/${t.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5">
      <div className={`relative flex h-40 items-end bg-gradient-to-br ${GRAD[t.category] ?? GRAD.DAY} p-4`}>
        <span className="font-display text-xl font-bold text-white drop-shadow">{t.destinationName}</span>
        <span className="badge absolute left-3 top-3 bg-white">{CATEGORY_LABEL[t.category]}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-bold leading-snug group-hover:text-gold-700">{t.title}</h3>
        <p className="mt-1 text-sm text-ink/70">{t.shortDescription}</p>
        <ul className="mt-2 space-y-1 text-sm text-ink/80">{hl.map((h) => <li key={h}>• {h}</li>)}</ul>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="badge">{duration(t)}</span>
          {t.isPrivateAvailable && <span className="badge">Private</span>}
          {t.isGroupAvailable && t.pricingModel === "PER_PERSON" && <span className="badge">Shared</span>}
          {t.rating && <span className="badge">★ {t.rating.avg.toFixed(1)} ({t.rating.count})</span>}
        </div>
        <div className="mt-auto flex items-end justify-between pt-4">
          <p className="text-sm text-ink/60">From <span className="text-lg font-bold text-ink">{money(price)}</span>{t.pricingModel === "PER_GROUP" ? " / group" : " / person"}{t.discountPrice != null && <s className="ml-1 text-ink/40">{money(t.price)}</s>}</p>
          <span className="btn btn-primary !px-4 !py-2">View</span>
        </div>
      </div>
    </Link>
  );
}
