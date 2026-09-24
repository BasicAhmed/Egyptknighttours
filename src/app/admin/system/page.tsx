import Link from "next/link";
import { client } from "@/db";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/format";
import { BOOT_STATE } from "@/db/bootstrap";
import BuilderCredit from "@/components/BuilderCredit";
export const dynamic = "force-dynamic";

type St = "ok" | "warn" | "fail";
type Check = { label: string; st: St; detail: string };
const DEMO_TOURS = ["giza-pyramids-sphinx-day-tour", "grand-egyptian-museum-pyramids-private-day", "cairo-old-town-coptic-islamic-khan-el-khalili", "luxor-east-and-west-bank-day-tour", "luxor-sunrise-hot-air-balloon", "aswan-philae-and-abu-simbel-day", "5-day-cairo-and-luxor-package", "cairo-airport-transfer"];
const one = async (sql: string, args: (string | number)[] = []) => (await client.execute({ sql, args })).rows[0] ?? {};
const num = async (sql: string, args: (string | number)[] = []) => Number(Object.values(await one(sql, args))[0] ?? 0);
const mb = (n: number) => `${(n / 1e6).toFixed(n > 1e7 ? 0 : 1)} MB`;

export default async function SystemPage() {
  await requireStaff("settings");
  const t0 = Date.now(); await client.execute("select 1"); const ping = Date.now() - t0;
  const [g, orders, customers, leads, tours, demo, guides, media, files, methods, reviews, admins, demoAdmin, destPhotos, state, notifRows] = await Promise.all([
    getSettings(), num("select count(*) from bookings"), num("select count(*) from customers"), num("select count(*) from leads"), num("select count(*) from tours where status='PUBLISHED'"),
    num(`select count(*) from tours where status='PUBLISHED' and slug in (${DEMO_TOURS.map(() => "?").join(",")})`, DEMO_TOURS), num("select count(*) from tour_guides where active=1"),
    one("select count(*) n, coalesce(sum(size),0) b from media"), one("select count(*) n, coalesce(sum(size),0) b from traveler_files"),
    num("select count(*) from payment_methods where active=1"), num("select count(*) from testimonials where active=1"), num("select count(*) from users"),
    num("select count(*) from users where email like '%.example' or email like '%example.com'"), num("select count(*) from destinations where image_url is not null and image_url != ''"), one("select value from settings where key='boot.state'"),
    client.execute("select type, recipient, subject, success, error, created_at from notification_log order by created_at desc limit 20"),
  ]);
  const dbUrl = process.env.DATABASE_URL ?? ""; const onVercel = !!process.env.VERCEL; const authLen = (process.env.AUTH_SECRET ?? "").length; const admPw = (process.env.ADMIN_PASSWORD ?? "").length;
  const notifs = notifRows.rows.map((r) => ({ type: String(r.type), recipient: String(r.recipient), subject: String(r.subject ?? ""), success: !!r.success, error: r.error ? String(r.error) : null, createdAt: Number(r.created_at) }));
  const recentFails = notifs.filter((n) => !n.success).length;
  const NOTIF_LABEL: Record<string, string> = { NEW_BOOKING: "New booking", NEW_LEAD: "New inquiry", PAYMENT_COMPLETE: "Order fully paid", ORDER_CANCELLED: "Order cancelled", CORPORATE_PAYMENT_COMPLETE: "Corporate request fully paid", CORPORATE_CANCELLED: "Corporate request cancelled", REVIEW_INVITE: "Review invite", STAFF_NEW_ORDER: "Order created in admin" };
  const infra: Check[] = [
    { label: "Database", st: ping < 400 ? "ok" : "warn", detail: `Connected. Response time ${ping} ms.${ping >= 400 ? " Slow: check the database and server are in the same region." : ""}` },
    { label: "Database type", st: dbUrl.startsWith("file:") && onVercel ? "fail" : "ok", detail: dbUrl.startsWith("file:") ? (onVercel ? "Local file database on Vercel. Data will be lost. Use Turso (libsql://…)." : "Local file database (fine for development).") : "Turso / libSQL (persistent, backed up by the provider)." },
    { label: "Schema up to date", st: String(state.value ?? "") === BOOT_STATE ? "ok" : "warn", detail: String(state.value ?? "") === BOOT_STATE ? `Version ${BOOT_STATE}.` : "The database will update itself on the next restart." },
    { label: "Server region", st: process.env.VERCEL_REGION ? "ok" : "warn", detail: process.env.VERCEL_REGION ? `Running in ${process.env.VERCEL_REGION}.` : "Not running on Vercel." },
    { label: "Website address", st: SITE.includes("localhost") ? "warn" : "ok", detail: SITE.includes("localhost") ? "Site URL not set. Add NEXT_PUBLIC_SITE_URL with your domain so links, sitemap and emails are correct." : SITE },
  ];
  const sec: Check[] = [
    { label: "Login secret (AUTH_SECRET)", st: authLen >= 32 ? "ok" : "fail", detail: authLen >= 32 ? "Strong." : "Too short. Use at least 32 random characters." },
    { label: "Admin password", st: admPw >= 12 ? "ok" : admPw >= 8 ? "warn" : "fail", detail: admPw >= 12 ? "Long enough." : "Use 12 or more characters, and don't reuse it elsewhere." },
    { label: "Passport encryption key", st: process.env.FILE_ENCRYPTION_KEY ? "ok" : "warn", detail: process.env.FILE_ENCRYPTION_KEY ? "Dedicated key set." : "Using a key derived from AUTH_SECRET. Add FILE_ENCRYPTION_KEY so it can't be lost if AUTH_SECRET changes." },
    { label: "Nightly maintenance", st: process.env.CRON_SECRET ? "ok" : "warn", detail: process.env.CRON_SECRET ? "Scheduled." : "Add CRON_SECRET in Vercel so cleanup and passport deletion can run." },
    { label: "Demo admin accounts", st: demoAdmin ? "warn" : "ok", detail: demoAdmin ? "A demo account with an example.com email exists. Remove it in the database." : "None." },
    { label: "Staff accounts", st: "ok", detail: `${admins} account${admins === 1 ? "" : "s"}.` },
  ];
  const biz: Check[] = [
    { label: "Payment details", st: methods ? "ok" : "warn", detail: methods ? `${methods} active payment method${methods > 1 ? "s" : ""}.` : "Add bank details in Settings so invoices show how to pay." },
    { label: "Email sending", st: !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM ? "warn" : /^.+<[^<>]+@[^<>]+>$/.test(process.env.EMAIL_FROM.trim()) ? "ok" : "warn",
      detail: !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM ? "Not connected. Invoices and itineraries can be sent by WhatsApp; add RESEND_API_KEY and EMAIL_FROM for email."
        : /^.+<[^<>]+@[^<>]+>$/.test(process.env.EMAIL_FROM.trim()) ? `Connected. Sends as: ${process.env.EMAIL_FROM}`
        : `Connected, but EMAIL_FROM (${process.env.EMAIL_FROM}) has no sender name — recipients see the raw address instead of a company name. Set it to "Egypt Knight Tours <${process.env.EMAIL_FROM.trim()}>" in Vercel.` },
    { label: "Admin notifications", st: recentFails ? "warn" : "ok", detail: !notifs.length ? "No notifications sent yet." : recentFails ? `${recentFails} of the last ${notifs.length} failed to send — see below.` : `All ${notifs.length} of the last notifications sent successfully.` },
    { label: "Staff alert emails", st: g["company.notifyEmails"] || g["company.email"] ? "ok" : "warn", detail: g["company.notifyEmails"] ? "Set in Settings → Company info." : g["company.email"] ? `Falling back to the company email (${g["company.email"]}). Add specific addresses in Settings → Company info to alert more than one person.` : "Not set — admin emails have nowhere to go. Add one in Settings → Company info." },
    { label: "Company details", st: g["company.licence"] && g["company.address"] ? "ok" : "warn", detail: g["company.licence"] && g["company.address"] ? "Address and licence set." : "Add your licence number and address (Settings → Company info). They appear on invoices and build trust." },
    { label: "Real tours", st: demo ? "warn" : tours ? "ok" : "warn", detail: demo ? `${demo} sample tour${demo > 1 ? "s are" : " is"} still published. Replace or edit them with your real tours and prices.` : `${tours} published.` },
    { label: "Reviews", st: reviews >= 3 ? "ok" : "warn", detail: `${reviews} shown on the homepage. Add your Tripadvisor reviews in Settings → Reviews.` },
    { label: "Tripadvisor and social links", st: g["site.tripadvisorUrl"] ? "ok" : "warn", detail: g["site.tripadvisorUrl"] ? "Tripadvisor link set." : "Add your Tripadvisor and social links in Settings → Website." },
    { label: "Photos", st: destPhotos >= 4 ? "ok" : "warn", detail: `${destPhotos} destination photo${destPhotos === 1 ? "" : "s"} uploaded. Real photos lift trust and search rankings.` },
    { label: "Tour guides", st: guides ? "ok" : "warn", detail: `${guides} available.` },
    { label: "Map location", st: g["site.mapQuery"] && g["site.mapQuery"] !== "Aswan, Egypt" ? "ok" : "warn", detail: g["site.mapQuery"] === "Aswan, Egypt" ? "Still the placeholder. Set your exact address in Settings → Website." : g["site.mapQuery"] },
    { label: "Referral program", st: g["referral.enabled"] === "false" ? "ok" : g["company.googleReviewUrl"] ? "ok" : "warn", detail: g["referral.enabled"] === "false" ? "Turned off in Settings → Referral program." : g["company.googleReviewUrl"] ? "On, with a Google review link set." : "On, but no Google review link set yet — add one in Settings → Referral program, or turn the program off if you're not using it." },
  ];
  const cls: Record<St, string> = { ok: "bg-[#DFF3E6] text-[#17663A]", warn: "bg-[#FFF0CF] text-[#7A4B00]", fail: "bg-[#FBDADA] text-[#8B1E1E]" }; const txt: Record<St, string> = { ok: "OK", warn: "To do", fail: "Fix now" };
  const groups: [string, Check[]][] = [["Infrastructure", infra], ["Security", sec], ["Ready to launch", biz]];
  const all = groups.flatMap(([, c]) => c); const fails = all.filter((c) => c.st === "fail").length, warns = all.filter((c) => c.st === "warn").length;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold sm:text-3xl">System status</h1><p className="text-sm text-ink/65">Health, security and launch checklist.</p></div><Link href="/admin/settings" className="btn btn-outline !min-h-[42px]">← Settings</Link></div>
      <p className={`mt-4 rounded-2xl p-4 text-[15px] font-bold ${fails ? cls.fail : warns ? cls.warn : cls.ok}`}>{fails ? `${fails} thing${fails > 1 ? "s" : ""} to fix now` : warns ? `Running well. ${warns} improvement${warns > 1 ? "s" : ""} before you're fully launched.` : "Everything is in order."}</p>
      {groups.map(([title, list]) => (
        <section key={title} className="mt-6"><h2 className="font-display text-xl font-extrabold">{title}</h2>
          <ul className="mt-2 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">{list.map((c) => <li key={c.label} className="flex items-start gap-3 p-4"><span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${cls[c.st]}`}>{txt[c.st]}</span><div className="min-w-0"><p className="font-semibold">{c.label}</p><p className="text-sm text-ink/70">{c.detail}</p></div></li>)}</ul></section>))}
      <section className="mt-6"><h2 className="font-display text-xl font-extrabold">Recent notifications</h2>
        <p className="text-sm text-ink/65">The last {notifs.length} admin/customer notification email{notifs.length === 1 ? "" : "s"} — so you can check one actually went out.</p>
        <ul className="mt-2 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {notifs.map((n, i) => (
            <li key={i} className="flex items-start gap-3 p-4">
              <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${n.success ? cls.ok : cls.fail}`}>{n.success ? "Sent" : "Failed"}</span>
              <div className="min-w-0"><p className="font-semibold">{NOTIF_LABEL[n.type] ?? n.type} <span className="font-normal text-ink/65">→ {n.recipient}</span></p>
                <p className="truncate text-sm text-ink/65">{n.subject}</p>
                {n.error && <p className="text-sm text-red-700">{n.error}</p>}
                <p className="text-xs text-ink/65">{new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </li>
          ))}
          {!notifs.length && <li className="p-4 text-sm text-ink/65">No notifications sent yet.</li>}
        </ul>
      </section>
      <section className="mt-6"><h2 className="font-display text-xl font-extrabold">Your data</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{([["Orders", orders], ["Customers", customers], ["Inquiries", leads], ["Photos", `${Number(media.n)} · ${mb(Number(media.b))}`], ["Passport files", `${Number(files.n)} · ${mb(Number(files.b))}`], ["Live tours", tours]] as [string, string | number][]).map(([k, v]) => <div key={k} className="rounded-2xl border border-ink/10 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-ink/65">{k}</p><p className="mt-1 font-display text-xl font-extrabold">{v}</p></div>)}</div>
        <div className="mt-3 flex flex-wrap gap-2"><a className="btn btn-outline !min-h-[42px]" href="/api/admin/export/orders">Download orders (CSV)</a><a className="btn btn-outline !min-h-[42px]" href="/api/admin/export/customers">Download customers (CSV)</a><a className="btn btn-outline !min-h-[42px]" href="/api/admin/export/leads">Download inquiries (CSV)</a></div>
        <p className="mt-2 text-sm text-ink/65">Exports never include passport details. Turso keeps automatic point-in-time backups; also download these regularly.</p></section>
      <section className="mt-6 rounded-3xl bg-ink p-6 text-white"><p className="font-display text-lg font-extrabold">Website & booking system</p><BuilderCredit prefix="Built and maintained by" className="mt-1 text-white/80" /><p className="mt-3 text-sm text-white/60">Version {(process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7)} · Node {process.version} · <a className="underline" href="/api/health" target="_blank" rel="noopener">Health check</a></p></section>
    </div>
  );
}
