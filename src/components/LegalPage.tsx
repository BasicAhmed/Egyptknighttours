export type LegalSection = { h: string; p?: string[]; items?: string[] };
export default function LegalPage({ eyebrow, title, updated, intro, sections }: { eyebrow: string; title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="container-x max-w-3xl py-12">
      <p className="eyebrow">{eyebrow}</p><h1 className="h1 mt-2 !text-[34px] sm:!text-5xl">{title}</h1>
      <p className="mt-2 text-sm text-ink/65">Last updated {updated}</p>
      <p className="mt-5 text-[17px] leading-relaxed text-ink/80">{intro}</p>
      <nav aria-label="On this page" className="mt-6 rounded-2xl border border-ink/10 bg-white p-4"><ol className="grid gap-1.5 text-[15px] sm:grid-cols-2">{sections.map((s, i) => <li key={s.h}><a className="font-semibold text-ink/80 hover:text-ink" href={`#s${i + 1}`}>{i + 1}. {s.h}</a></li>)}</ol></nav>
      <div className="mt-8 space-y-8">{sections.map((s, i) => (
        <section key={s.h} id={`s${i + 1}`} className="scroll-mt-24"><h2 className="font-display text-2xl font-extrabold">{i + 1}. {s.h}</h2>
          {s.p?.map((t, k) => <p key={k} className="mt-3 text-[16px] leading-relaxed text-ink/80">{t}</p>)}
          {s.items && <ul className="mt-3 space-y-2 text-[16px] leading-relaxed text-ink/80">{s.items.map((t, k) => <li key={k} className="flex gap-3"><span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />{t}</li>)}</ul>}</section>))}</div>
    </div>
  );
}
