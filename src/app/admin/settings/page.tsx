import { redirect } from "next/navigation";
import { db, schema as s } from "@/db";
import { asc, desc } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveCompanySettings, savePaymentMethod, deletePaymentMethod } from "../doc-actions";
import Notice from "@/components/Notice";
import ImageField from "@/components/ImageField";
import { saveTestimonial, deleteTestimonial, bulkAddTestimonials, saveGuide, deleteGuide, bulkAddGuides, saveRedirect, deleteRedirect, bulkAddRedirects } from "../site-actions";
import { resolveLegacy } from "@/lib/legacy-server";
export const dynamic = "force-dynamic";
type M = typeof s.paymentMethods.$inferSelect;

const F = ({ name, label, v, type = "text", ph }: { name: string; label: string; v?: string | number; type?: string; ph?: string }) => <label className="block"><span className="label">{label}</span><input name={name} type={type} defaultValue={v ?? ""} placeholder={ph} className="input" /></label>;
function MethodForm({ m }: { m?: M }) {
  const act = savePaymentMethod.bind(null, m?.id ?? null);
  return (
    <form action={act} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label">Type</label><select name="kind" aria-label="Payment method type" defaultValue={m?.kind ?? "BANK"} className="input"><option value="BANK">Bank transfer</option><option value="LINK">Payment link</option><option value="WISE">Wise</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></div>
      <F name="label" label="Label shown to customers" v={m?.label} ph="Bank transfer (EUR)" />
      <F name="currency" label="Currency (blank = any)" v={m?.currency} ph="EUR" />
      <F name="sortOrder" label="Order" type="number" v={m?.sortOrder ?? 0} />
      <F name="bankName" label="Bank name" v={m?.bankName} /><F name="accountName" label="Account name" v={m?.accountName} />
      <F name="accountNumber" label="Account number" v={m?.accountNumber} /><F name="iban" label="IBAN" v={m?.iban} />
      <F name="swift" label="SWIFT / BIC" v={m?.swift} /><F name="branch" label="Branch" v={m?.branch} />
      <div className="sm:col-span-2"><F name="bankAddress" label="Bank address" v={m?.bankAddress} /></div>
      <div className="sm:col-span-2"><F name="paymentUrl" label="Payment link (https://…), makes the PDF button clickable" v={m?.paymentUrl} /></div>
      <div className="sm:col-span-2"><label className="label">Extra payment instructions</label><textarea name="instructions" aria-label="Extra payment instructions" rows={2} defaultValue={m?.instructions} className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={m?.active ?? true} className="h-5 w-5 accent-black" />Show on new invoices</label>
      <div className="flex gap-2 sm:justify-end"><button className="btn btn-dark">{m ? "Save" : "Add payment method"}</button></div>
    </form>
  );
}
export default async function Settings({ searchParams }: { searchParams: Promise<{ n?: string; e?: string; tab?: string }> }) {
  await requireStaff("settings"); const sp = await searchParams; if (sp.tab === "system") redirect("/admin/system"); const tab = ["company", "wording", "website", "reviews", "guides", "redirects", "referral"].includes(String(sp.tab)) ? String(sp.tab) : "payment";
  const g = await getSettings();
  const methods = await db.select().from(s.paymentMethods).orderBy(asc(s.paymentMethods.sortOrder), asc(s.paymentMethods.createdAt));
  const T = ({ k, label, rows = 4 }: { k: string; label: string; rows?: number }) => <div className="sm:col-span-2"><label className="label" htmlFor={`t-${k}`}>{label}</label><textarea id={`t-${k}`} name={k} rows={rows} defaultValue={g[k]} className="input" /></div>;
  const tabs: [string, string][] = [["payment", "Payment details"], ["company", "Company info"], ["website", "Website"], ["reviews", "Reviews"], ["guides", "Tour guides"], ["redirects", "Redirects"], ["referral", "Referral program"], ["wording", "Invoice wording"], ["system", "System status"]];
  const redirectRows = tab === "redirects" ? await db.select().from(s.redirects).orderBy(desc(s.redirects.createdAt)).limit(500) : [];
  const testPath = tab === "redirects" ? String((sp as Record<string, string | undefined>).t ?? "").trim() : "";
  const testResult = testPath ? await resolveLegacy(testPath) : null;
  const guidesList = tab === "guides" ? await db.select().from(s.tourGuides).orderBy(asc(s.tourGuides.name)) : [];
  const reviews = tab === "reviews" ? await db.select().from(s.testimonials).orderBy(asc(s.testimonials.sortOrder), asc(s.testimonials.createdAt)) : [];
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Settings</h1><p className="text-sm text-ink/65">These feed your invoices and itineraries. New PDFs use whatever is saved here.</p>
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">{tabs.map(([k, l]) => <a key={k} href={`/admin/settings?tab=${k}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${tab === k ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70"}`}>{l}</a>)}</div>
      <div className="mt-4"><Notice n={sp.n} e={sp.e} /></div>
      {tab === "payment" && <section>
        <p className="mb-4 text-sm text-ink/65">Bank details are stored here only, never in the code. Add a payment link to make the invoice button clickable.</p>
        <div className="space-y-3">
          {methods.map((m) => <details key={m.id} className="rounded-2xl border border-ink/10 bg-white p-4"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold">{m.label}<span className="flex gap-2"><span className="badge">{m.kind}</span>{m.currency && <span className="badge">{m.currency}</span>}<span className="badge">{m.active ? "Active" : "Hidden"}</span></span></summary>
            <div className="mt-4"><MethodForm m={m} /><form action={deletePaymentMethod.bind(null, m.id)} className="mt-3"><button className="btn btn-outline !min-h-[40px] !py-2 text-red-700">Delete this method</button></form></div></details>)}
          <details className="rounded-2xl border border-ink/10 bg-white p-4" open={methods.length === 0}><summary className="cursor-pointer font-semibold">+ Add a payment method</summary><div className="mt-4"><MethodForm /></div></details>
        </div></section>}
      {tab === "reviews" && <ReviewsAdmin reviews={reviews} />}
      {tab === "guides" && <GuidesAdmin guides={guidesList} />}
      {tab === "redirects" && <RedirectsAdmin rows={redirectRows} testPath={testPath} testResult={testResult} />}
      {tab !== "payment" && tab !== "reviews" && tab !== "guides" && tab !== "redirects" && <form action={saveCompanySettings} className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-2"><input type="hidden" name="tab" value={tab} />
        {tab === "referral" && <>
          <p className="text-sm text-ink/65 sm:col-span-2">A completed trip invites the customer to review it, then unlocks a code they can share. Set the numbers below to match your business.</p>
          <label className="block"><span className="label">Program is</span><select name="referral.enabled" defaultValue={g["referral.enabled"]} className="input"><option value="true">On</option><option value="false">Off</option></select></label>
          <F name="company.googleReviewUrl" label="Google review link" v={g["company.googleReviewUrl"]} ph="https://g.page/r/..." />
          <h2 className="mt-2 font-display text-xl font-bold sm:col-span-2">What the friend gets</h2>
          <label className="block"><span className="label">Discount type</span><select name="referral.friendDiscountType" defaultValue={g["referral.friendDiscountType"]} className="input"><option value="PERCENT">Percent off</option><option value="FIXED">Fixed amount off</option></select></label>
          <F name="referral.friendDiscountValue" label="Discount value" type="number" v={g["referral.friendDiscountValue"]} />
          <h2 className="mt-2 font-display text-xl font-bold sm:col-span-2">What the referrer earns</h2>
          <label className="block"><span className="label">Reward type</span><select name="referral.rewardType" defaultValue={g["referral.rewardType"]} className="input"><option value="PERCENT">Percent of the friend's booking</option><option value="FIXED">Fixed amount</option></select></label>
          <F name="referral.rewardValue" label="Reward value" type="number" v={g["referral.rewardValue"]} />
          <p className="text-xs text-ink/65 sm:col-span-2">Paid the moment the friend's booking receives its first payment. Reviews on Tripadvisor and Facebook use the links already set in the Website tab.</p>
</>}
        {tab === "company" && <>
          <F name="company.name" label="Company name" v={g["company.name"]} /><F name="company.email" label="Email" v={g["company.email"]} /><div className="sm:col-span-2"><F name="company.notifyEmails" label="Staff alert emails (comma separated, optional)" v={g["company.notifyEmails"]} ph="info@egyptknight.com, name@gmail.com" /><p className="mt-1 text-xs text-ink/65">New booking and new inquiry alerts go here. Leave blank to just use the Email above.</p></div>
          <F name="company.whatsapp" label="WhatsApp number" v={g["company.whatsapp"]} /><F name="company.phone" label="Phone" v={g["company.phone"]} />
          <F name="company.website" label="Website" v={g["company.website"]} /><F name="company.licence" label="Licence / registration number" v={g["company.licence"]} />
          <div className="sm:col-span-2"><F name="company.address" label="Address" v={g["company.address"]} /></div>
          <F name="company.signatureName" label="Signature name (optional)" v={g["company.signatureName"]} /><F name="company.signatureTitle" label="Signature title" v={g["company.signatureTitle"]} />
          <h2 className="mt-2 font-display text-xl font-bold sm:col-span-2">Exchange rates</h2>
          <p className="text-sm text-ink/65 sm:col-span-2">How many US dollars is one unit of each currency worth? Used to combine Finance and Reports into one figure when orders use different currencies — update these from time to time.</p>
          <F name="fx.EUR" label="1 EUR =" type="number" v={g["fx.EUR"]} ph="1.14" /><F name="fx.GBP" label="1 GBP =" type="number" v={g["fx.GBP"]} ph="1.32" />
          <F name="fx.EGP" label="1 EGP =" type="number" v={g["fx.EGP"]} ph="0.0194" /><F name="fx.AED" label="1 AED =" type="number" v={g["fx.AED"]} ph="0.2722" />
          <F name="fx.SAR" label="1 SAR =" type="number" v={g["fx.SAR"]} ph="0.2667" />
          <h2 className="mt-2 font-display text-xl font-bold sm:col-span-2">Privacy</h2>
          <F name="privacy.passportRetentionDays" label="Delete passport files this many days after the trip (0 = never)" type="number" v={g["privacy.passportRetentionDays"]} />
          <p className="self-end text-sm text-ink/65">Runs nightly. Deletes uploaded passport and visa files and the stored passport number.</p>
</>}
        {tab === "website" && <>
          <p className="text-sm text-ink/65 sm:col-span-2">These numbers and links appear on the homepage. Only use figures you can back up.</p>
          <div className="sm:col-span-2"><ImageField name="site.heroImage" label="Homepage main photo" value={g["site.heroImage"]} hint="Large landscape or portrait photo shown next to the headline." /></div>
          <F name="site.years" label="Years of experience (number)" v={g["site.years"]} /><F name="site.tours" label="Tours completed (e.g. 5,000)" v={g["site.tours"]} />
          <F name="site.reviews" label="Five-star reviews (e.g. 500)" v={g["site.reviews"]} /><F name="site.tripadvisorUrl" label="Tripadvisor page link (https://…)" v={g["site.tripadvisorUrl"]} />
          <F name="site.instagram" label="Instagram link" v={g["site.instagram"]} /><F name="site.facebook" label="Facebook link" v={g["site.facebook"]} />
          <F name="site.tiktok" label="TikTok link" v={g["site.tiktok"]} /><F name="site.youtube" label="YouTube link" v={g["site.youtube"]} />
          <F name="site.videoUrl" label="Homepage video (YouTube link)" v={g["site.videoUrl"]} /><F name="site.videoStart" label="Video starts at (seconds)" type="number" v={g["site.videoStart"]} />
          <F name="site.mapQuery" label="Map location (address or place name)" v={g["site.mapQuery"]} /><F name="site.mapLink" label="Google Maps link (for the Open in Maps button)" v={g["site.mapLink"]} />
          <div className="sm:col-span-2"><F name="site.hours" label="Opening hours text" v={g["site.hours"]} /></div></>}
        {tab === "wording" && <>
          <F name="invoice.depositDeadlineDays" label="Days to pay a deposit or full amount" type="number" v={g["invoice.depositDeadlineDays"]} /><F name="invoice.balanceDaysBefore" label="Balance due (days before travel)" type="number" v={g["invoice.balanceDaysBefore"]} />
          <T k="invoice.paymentTerms" label="Payment terms (one per line)" /><T k="invoice.documents" label="Documents to send (one per line)" rows={3} />
          <T k="invoice.cancellation" label="Cancellation policy (one per line)" rows={6} /><T k="invoice.note" label="Important payment note" rows={2} /></>}
        <div className="sm:col-span-2"><button className="btn btn-primary !min-h-[46px]">Save</button></div>
      </form>}
    </div>
  );
}

function ReviewsAdmin({ reviews }: { reviews: (typeof s.testimonials.$inferSelect)[] }) {
  const Form = ({ r }: { r?: typeof s.testimonials.$inferSelect }) => (
    <form action={saveTestimonial.bind(null, r?.id ?? null)} className="grid gap-3 sm:grid-cols-2">
      <F name="name" label="Reviewer name (as shown, e.g. Anna M.)" v={r?.name} /><F name="country" label="Country" v={r?.country} />
      <F name="title" label="Review title" v={r?.title} /><F name="reviewDate" label="Date (e.g. March 2026)" v={r?.reviewDate} />
      <div className="sm:col-span-2"><label className="label" htmlFor="rv-body">Review text (exactly as written)</label><textarea id="rv-body" name="body" rows={4} defaultValue={r?.body} className="input" required /></div>
      <F name="source" label="Source" v={r?.source ?? "Tripadvisor"} /><F name="url" label="Link to the review (optional, https://…)" v={r?.url} />
      <input type="hidden" name="rating" value={r?.rating ?? 5} /><F name="sortOrder" label="Order (0 = first)" type="number" v={r?.sortOrder ?? 0} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={r?.active ?? true} className="h-5 w-5 accent-black" />Show on homepage</label>
      <div className="sm:col-span-2"><button className="btn btn-dark">{r ? "Save review" : "Add review"}</button></div>
    </form>);
  return (
    <section className="space-y-4">
      <p className="text-sm text-ink/65">Add real reviews (copy them from Tripadvisor exactly as written). They show on the homepage. Only add genuine five-star reviews you are entitled to display.</p>
      <details className="rounded-2xl border border-ink/10 bg-white p-4"><summary className="cursor-pointer font-semibold">Paste many reviews at once</summary>
        <form action={bulkAddTestimonials} className="mt-3 grid gap-3">
          <div><label className="label">One review per line: Name | Country | Date | Title | Review text</label><textarea name="bulk" rows={6} className="input" placeholder="Anna M. | Germany | March 2026 | Unforgettable Luxor day | Our guide made the temples come alive…" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><F name="source" label="Source" v="Tripadvisor" /><F name="url" label="Link (optional)" /></div><button className="btn btn-dark w-fit">Add all</button></form></details>
      {reviews.map((r) => <details key={r.id} className="rounded-2xl border border-ink/10 bg-white p-4"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold"><span>{r.name}{r.country ? `, ${r.country}` : ""} <span className="font-normal text-ink/65">· {r.title || r.body.slice(0, 40)}</span></span><span className="badge">{r.active ? "Live" : "Hidden"}</span></summary>
        <div className="mt-4"><Form r={r} /><form action={deleteTestimonial.bind(null, r.id)} className="mt-3"><button className="btn btn-outline !min-h-[40px] !py-2 text-red-700">Delete</button></form></div></details>)}
      <details className="rounded-2xl border border-ink/10 bg-white p-4" open={reviews.length === 0}><summary className="cursor-pointer font-semibold">+ Add one review</summary><div className="mt-4"><Form /></div></details>
    </section>
  );
}

function GuidesAdmin({ guides }: { guides: (typeof s.tourGuides.$inferSelect)[] }) {
  const Form = ({ g }: { g?: typeof s.tourGuides.$inferSelect }) => (
    <form action={saveGuide.bind(null, g?.id ?? null)} className="grid gap-3 sm:grid-cols-2">
      <F name="name" label="Guide name" v={g?.name} /><F name="phone" label="WhatsApp / phone (with country code)" v={g?.phone} />
      <F name="languages" label="Languages (comma separated)" v={g?.languages} />
      <F name="notes" label="Notes (private)" v={g?.notes} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={g?.active ?? true} className="h-5 w-5 accent-black" />Available for assignment</label>
      <div className="sm:col-span-2"><button className="btn btn-dark">{g ? "Save guide" : "Add guide"}</button></div>
    </form>);
  return (
    <section className="space-y-3">
      <p className="text-sm text-ink/65">Your team of tour guides. Staff pick one for each order in the order's Operations tab. Names are only shown to staff.</p>
      <details className="rounded-2xl border border-gold-600/40 bg-gold-500/10 p-4"><summary className="cursor-pointer font-semibold">Paste many guides at once</summary>
        <form action={bulkAddGuides} className="mt-3 grid gap-3">
          <div><label className="label" htmlFor="gbulk">One guide per block: name, then language, then phone number(s). Leave a blank line between guides. Only the first phone number is saved.</label><textarea id="gbulk" name="bulk" rows={10} className="input" placeholder={"Guide Name\nEnglish\n+20 10 00000000\n\nAnother Guide\nSpanish\n010 00000001"} /></div>
          <button className="btn btn-dark w-fit">Add all guides</button></form></details>
      {guides.map((g) => <details key={g.id} className="rounded-2xl border border-ink/10 bg-white p-4"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold"><span>{g.name} <span className="font-normal text-ink/65">· {g.languages || "no languages set"}</span></span><span className="badge">{g.active ? "Available" : "Inactive"}</span></summary>
        <div className="mt-4"><Form g={g} /><form action={deleteGuide.bind(null, g.id)} className="mt-3"><button className="btn btn-outline !min-h-[40px] !py-2 text-red-700">Delete guide</button></form></div></details>)}
      <details className="rounded-2xl border border-ink/10 bg-white p-4" open={guides.length === 0}><summary className="cursor-pointer font-semibold">+ Add a guide</summary><div className="mt-4"><Form /></div></details>
    </section>
  );
}

function RedirectsAdmin({ rows, testPath, testResult }: { rows: (typeof s.redirects.$inferSelect)[]; testPath: string; testResult: { to: string; status: number; source: string } | null }) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gold-600/40 bg-gold-500/10 p-4 text-sm"><p className="font-semibold">Why this matters</p><p className="mt-1 text-ink/70">When you move from an old website, every old address that people or Google know must lead to the right new page, or you lose visitors and search rankings. Add each old address here. Common WordPress tour-site addresses are already covered automatically (destinations, cruises, the custom trip page and language versions).</p></div>
      <form method="get" className="flex flex-wrap items-end gap-2 rounded-2xl border border-ink/10 bg-white p-4"><input type="hidden" name="tab" value="redirects" />
        <label className="block min-w-[240px] flex-1"><span className="label">Test an old address</span><input name="t" defaultValue={testPath} placeholder="/tour-destination/luxor/  or  https://old-site.com/tours/my-tour/" className="input" /></label><button className="btn btn-dark !min-h-[46px]">Test</button>
        {testPath && <p className="w-full text-sm font-semibold">{testResult ? <>→ <span className="text-[#17663A]">{testResult.to}</span> <span className="font-normal text-ink/65">({testResult.status}, {testResult.source === "manual" ? "your redirect" : "built-in rule"})</span></> : <span className="text-[#8A4B0A]">No redirect. This address would show a 404 page.</span>}</p>}</form>
      <details className="rounded-2xl border border-ink/10 bg-white p-4" open={rows.length === 0}><summary className="cursor-pointer font-semibold">Paste many redirects at once</summary>
        <form action={bulkAddRedirects} className="mt-3 grid gap-3"><label className="block"><span className="label">One per line: old address, then new address (space, comma or tab between them). Full web addresses are fine.</span><textarea name="bulk" rows={8} className="input" placeholder={"/tours/nile-cruise-aswan-luxor-3-days-2-nights-2/  /tours/nile-cruise-3-days\nhttps://old-site.com/blog/best-time-to-visit-egypt/  /egypt-travel-guide/best-time-to-visit-egypt"} /></label><button className="btn btn-dark w-fit">Save all</button></form></details>
      <details className="rounded-2xl border border-ink/10 bg-white p-4"><summary className="cursor-pointer font-semibold">+ Add one redirect</summary>
        <form action={saveRedirect} className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block"><span className="label">Old address</span><input name="from" className="input" placeholder="/old-page/" required /></label><label className="block"><span className="label">New page on this site</span><input name="to" className="input" placeholder="/tours/new-page" required /></label>
          <label className="block"><span className="label">Type</span><select name="status" className="input"><option value="301">Permanent (301), recommended</option><option value="302">Temporary (302)</option></select></label><label className="block"><span className="label">Note (optional)</span><input name="note" className="input" /></label><div className="sm:col-span-2"><button className="btn btn-dark">Save redirect</button></div></form></details>
      <div className="rounded-2xl border border-ink/10 bg-white"><p className="border-b border-ink/10 p-4 font-semibold">{rows.length} saved redirect{rows.length === 1 ? "" : "s"}</p>
        <ul className="divide-y divide-ink/10">{rows.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"><span className="min-w-0 break-all"><b>{r.fromPath}</b> <span className="text-ink/50">→</span> {r.toPath} <span className="text-ink/60">({r.status}){r.note ? ` · ${r.note}` : ""}</span></span><form action={deleteRedirect.bind(null, r.id)}><button className="text-sm font-semibold text-red-700 underline">Remove</button></form></li>)}</ul></div>
    </section>
  );
}
