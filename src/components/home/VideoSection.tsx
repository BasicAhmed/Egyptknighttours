"use client";
import { useState } from "react";
import Link from "next/link";

export function youtubeId(url: string): string | null {
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/.exec(url ?? ""); return m ? m[1] : null;
}
// Video with a light "click to play" cover, so the page stays fast. It starts playing at the chosen second.
export default function VideoSection({ url, start }: { url: string; start: string }) {
  const id = youtubeId(url); const [play, setPlay] = useState(false); const [hq, setHq] = useState(false);
  if (!id) return null;
  const s = Math.max(0, Math.round(Number(start) || 0));
  return (
    <section className="container-x py-16" aria-labelledby="video-h">
      <div className="grid items-center gap-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-14">
        <div>
          <p className="eyebrow">Watch</p>
          <h2 id="video-h" className="h2 mt-2">See Egypt with Egypt Knight Tours</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-ink/70">From the Giza pyramids to the Nile, a quick look at what a day with our team feels like. Private Egypt tours, local guides and no stress.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/tours" className="btn btn-primary">Browse Egypt tours</Link><Link href="/plan-my-trip" className="btn btn-outline">Plan my trip</Link></div>
        </div>
        <div className="relative overflow-hidden rounded-[28px] border border-ink/10 bg-ink shadow-[0_24px_60px_rgba(20,16,16,.22)]">
          <div className="relative aspect-video">
            {play ? (
              <iframe title="Egypt Knight Tours video" className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&start=${s}&rel=0&modestbranding=1&playsinline=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : (
              <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 block h-full w-full" aria-label="Play the Egypt Knight Tours video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${id}/${hq ? "hqdefault" : "maxresdefault"}.jpg`} onError={() => setHq(true)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                <span className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
                <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold-500 text-ink shadow-2xl transition group-hover:scale-110 sm:h-24 sm:w-24"><svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-1.5 text-sm font-bold shadow">Play video</span>
              </button>)}
          </div>
        </div>
      </div>
    </section>
  );
}
