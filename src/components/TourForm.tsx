import { db, schema as s } from "../db";
import { saveTour } from "../app/admin/actions";
import { parseJson } from "../lib/format";
import ImageField from "./ImageField";
import TourPricingFields from "./TourPricingFields";

type T = typeof s.tours.$inferSelect;
export default async function TourForm({ tour, error, canFinance = false }: { tour?: T; error?: string; canFinance?: boolean }) {
  const dests = await db.select().from(s.destinations);
  const act = saveTour.bind(null, tour?.id ?? null);
  const j = <X,>(v: string | undefined, f: X) => (v ? parseJson<X>(v, f) : f);
  const it = j<{ title: string; text: string }[]>(tour?.itinerary, []).map((x) => `${x.title} | ${x.text}`).join("\n");
  const fq = j<{ q: string; a: string }[]>(tour?.faqs, []).map((x) => `${x.q} | ${x.a}`).join("\n");
  const sel = (name: string, opts: string[][], v?: string) => <div><label className="label" htmlFor={`tf-${name}`}>{name === "destinationId" ? "Destination" : name === "category" ? "Category" : name === "audience" ? "Audience" : name === "activityLevel" ? "Activity level" : name === "status" ? "Status" : name}</label><select id={`tf-${name}`} name={name} defaultValue={v} className="input">{opts.map(([val, l]) => <option key={val} value={val}>{l}</option>)}</select></div>;
  const inp = (name: string, label: string, v?: string | number | null, type = "text") => <div><label className="label" htmlFor={`tf-${name}`}>{label}</label><input id={`tf-${name}`} name={name} type={type} step="any" defaultValue={v ?? ""} className="input" /></div>;
  const ta = (name: string, label: string, v: string | undefined, rows = 4, hint?: string) => <div className="sm:col-span-2"><label className="label" htmlFor={`tf-${name}`}>{label}{hint && <span className="ml-2 font-normal text-ink/65">{hint}</span>}</label><textarea id={`tf-${name}`} name={name} rows={rows} defaultValue={v} className="input" /></div>;
  return <form action={act} className="card grid gap-4 p-5 sm:grid-cols-2">
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
    {inp("title", "Title", tour?.title)}{inp("slug", "Slug (lowercase-with-dashes)", tour?.slug)}
    {ta("shortDescription", "Short description", tour?.shortDescription, 2)}{ta("longDescription", "Long description", tour?.longDescription, 6)}
    {sel("destinationId", dests.map((d) => [d.id, d.name]), tour?.destinationId)}
    {sel("category", [["DAY", "Day tour"], ["MULTI_DAY", "Multi-day"], ["NILE_CRUISE", "Nile cruise"], ["TRANSFER", "Transfer"]], tour?.category)}
    {sel("audience", [["ALL", "All"], ["FAMILY", "Family"], ["COUPLE", "Couple"], ["FRIENDS", "Friends"]], tour?.audience)}
    {sel("activityLevel", [["EASY", "Easy"], ["MODERATE", "Moderate"], ["ACTIVE", "Active"]], tour?.activityLevel)}
    {inp("durationHours", "Duration (hours)", tour?.durationHours ?? 8, "number")}{inp("durationDays", "Duration (days)", tour?.durationDays ?? 1, "number")}
    {sel("pricingModel", [["PER_PERSON", "Per person"], ["PER_GROUP", "Per group"]], tour?.pricingModel)}
    {canFinance ? <TourPricingFields priceMode={tour?.priceMode ?? "MANUAL"} price={tour?.price} discountPrice={tour?.discountPrice} costPrice={tour?.costPrice} marginPercent={tour?.marginPercent} />
      : <>{inp("price", "Price (USD)", tour?.price, "number")}{inp("discountPrice", "Discount price (optional)", tour?.discountPrice, "number")}</>}
    {inp("childPercent", "Child price % of adult", tour?.childPercent ?? 50, "number")}{inp("privateSurcharge", "Private upgrade (flat, USD)", tour?.privateSurcharge ?? 0, "number")}
    {inp("maxTravelers", "Max travelers", tour?.maxTravelers ?? 12, "number")}
    <div className="flex items-center gap-6 pt-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="isPrivateAvailable" defaultChecked={tour?.isPrivateAvailable ?? true} className="h-5 w-5 accent-black" />Private</label><label className="flex items-center gap-2"><input type="checkbox" name="isGroupAvailable" defaultChecked={tour?.isGroupAvailable ?? true} className="h-5 w-5 accent-black" />Shared</label></div>
    {ta("highlights", "Highlights", j<string[]>(tour?.highlights, []).join("\n"), 4, "one per line")}{ta("itinerary", "Itinerary", it, 5, "Title | description, one per line")}
    {ta("included", "Included", j<string[]>(tour?.included, []).join("\n"), 4, "one per line")}{ta("excluded", "Excluded", j<string[]>(tour?.excluded, []).join("\n"), 4, "one per line")}
    {ta("pickupInfo", "Pickup information", tour?.pickupInfo, 2)}{ta("meetingPoint", "Meeting point", tour?.meetingPoint, 2)}{ta("whatToBring", "What to bring", tour?.whatToBring, 2)}{ta("cancellationPolicy", "Cancellation policy", tour?.cancellationPolicy, 2)}
    {ta("faqs", "FAQ", fq, 4, "Question | answer, one per line")}
    <div className="sm:col-span-2"><ImageField name="imageUrl" label="Tour photo (shown on cards and the tour page)" value={tour?.imageUrl} hint="Upload from your phone or computer. Landscape photos look best." /></div>
    {inp("seoTitle", "SEO title (max 70)", tour?.seoTitle)}{inp("seoDescription", "SEO description (max 170)", tour?.seoDescription)}
    {sel("status", [["DRAFT", "Draft"], ["PUBLISHED", "Published"], ["ARCHIVED", "Archived"]], tour?.status ?? "DRAFT")}
    <div className="sm:col-span-2"><button className="btn btn-primary">Save tour</button></div>
  </form>;
}
