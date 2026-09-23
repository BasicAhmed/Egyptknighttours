// Sends email through Resend when RESEND_API_KEY is set. Without it nothing is sent and the caller is told plainly.
export type MailResult = { ok: true; id?: string } | { ok: false; reason: "NOT_CONFIGURED" | "FAILED"; message: string };
export async function sendEmail(o: { to: string | string[]; subject: string; html: string; text: string; attachments?: { filename: string; content: Buffer }[]; replyTo?: string }): Promise<MailResult> {
  const key = (process.env.RESEND_API_KEY ?? "").trim(); const from = (process.env.EMAIL_FROM ?? "").trim();
  if (!key || !from) return { ok: false, reason: "NOT_CONFIGURED", message: "Email isn't set up yet. Add RESEND_API_KEY and EMAIL_FROM in your hosting settings." };
  try {
    const r = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: Array.isArray(o.to) ? o.to : [o.to], subject: o.subject, html: o.html, text: o.text, reply_to: o.replyTo || undefined, attachments: o.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, reason: "FAILED", message: String((j as { message?: string }).message ?? `Email provider returned ${r.status}`).slice(0, 200) };
    return { ok: true, id: (j as { id?: string }).id };
  } catch (e) { return { ok: false, reason: "FAILED", message: String((e as Error).message).slice(0, 200) }; }
}
export function brandedEmail(o: { greeting: string; lines: string[]; buttonLabel: string; buttonUrl: string; footer: string; builder?: string }) {
  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px;color:#141010"><div style="max-width:560px;margin:auto"><div style="background:#F0B050;border-radius:14px;padding:22px"><p style="margin:0;font-size:12px;letter-spacing:2px;font-weight:700">EGYPT KNIGHT TOURS</p><h1 style="margin:8px 0 0;font-size:24px;line-height:1.15">${esc(o.greeting)}</h1></div><div style="padding:18px 4px">${o.lines.map((l) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${esc(l)}</p>`).join("")}<p style="margin:20px 0"><a href="${o.buttonUrl}" style="background:#141010;color:#F0B050;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px;display:inline-block">${esc(o.buttonLabel)}</a></p><p style="font-size:12px;color:#6B6560">${esc(o.footer)}</p>${o.builder ? `<p style="font-size:11px;color:#8a8580;margin-top:14px">Booking system by ${esc(o.builder)}</p>` : ""}</div></div></div>`;
  const text = `${o.greeting}\n\n${o.lines.join("\n\n")}\n\n${o.buttonLabel}: ${o.buttonUrl}\n\n${o.footer}${o.builder ? `\nBooking system by ${o.builder}` : ""}`;
  return { html, text };
}
