import Link from "next/link";
import { parseGuideBody, parseInline } from "@/lib/guide-body";

export function Inline({ text }: { text: string }) {
  return <>{parseInline(text).map((x, i) => x.k === "b" ? <strong key={i} className="font-bold text-ink">{x.text}</strong> : x.k === "a" ? (x.href!.startsWith("/") ? <Link key={i} href={x.href!} className="font-semibold text-ink underline decoration-gold-600 decoration-2 underline-offset-4 hover:bg-gold-500/20">{x.text}</Link> : <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-gold-600 decoration-2 underline-offset-4">{x.text}</a>) : <span key={i}>{x.text}</span>)}</>;
}
export default function GuideBody({ body }: { body: string }) {
  return (
    <div className="space-y-5 text-[17px] leading-[1.75] text-ink/85">
      {parseGuideBody(body).map((b, i) => {
        if (b.t === "h2") return <h2 key={i} id={b.id} className="scroll-mt-24 pt-6 font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[30px]">{b.text}</h2>;
        if (b.t === "h3") return <h3 key={i} id={b.id} className="scroll-mt-24 pt-2 font-display text-xl font-extrabold text-ink">{b.text}</h3>;
        if (b.t === "p") return <p key={i}><Inline text={b.text} /></p>;
        if (b.t === "ul") return <ul key={i} className="space-y-2 pl-1">{b.items.map((x, k) => <li key={k} className="flex gap-3"><span className="mt-[11px] h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden /><span><Inline text={x} /></span></li>)}</ul>;
        if (b.t === "ol") return <ol key={i} className="space-y-3">{b.items.map((x, k) => <li key={k} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-gold-500">{k + 1}</span><span className="pt-0.5"><Inline text={x} /></span></li>)}</ol>;
        if (b.t === "callout") return (
          <aside key={i} className="rounded-2xl border border-gold-600/40 bg-gold-500/15 p-5">
            {b.title && <p className="font-display text-lg font-extrabold text-ink">{b.title}</p>}
            {b.text.map((x, k) => <p key={k} className="mt-1 text-[16px]"><Inline text={x} /></p>)}
            {b.items.length > 0 && <ul className="mt-2 space-y-1.5 text-[16px]">{b.items.map((x, k) => <li key={k} className="flex gap-2.5"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden /><span><Inline text={x} /></span></li>)}</ul>}
          </aside>);
        if (b.t !== "table") return null;
        return (
          <div key={i} className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-[0_2px_12px_rgba(20,16,16,.05)]">
            <table className="w-full min-w-[520px] border-collapse text-left text-[15px] leading-snug"><thead><tr className="bg-ink text-white">{b.head.map((h, k) => <th key={k} className="px-4 py-3 font-display font-bold">{h}</th>)}</tr></thead>
              <tbody>{b.rows.map((r, k) => <tr key={k} className={k % 2 ? "bg-ink/[.03]" : ""}>{r.map((c, j) => <td key={j} className={`px-4 py-3 align-top ${j === 0 ? "font-bold text-ink" : "text-ink/80"}`}><Inline text={c} /></td>)}</tr>)}</tbody></table></div>);
      })}
    </div>
  );
}
