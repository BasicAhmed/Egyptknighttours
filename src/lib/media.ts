export const isMediaPath = (u: string | null | undefined) => !!u && /^\/api\/media\/[\w-]{8,64}$/.test(u);
// Image fields accept an uploaded photo (our own path) or a normal https link.
export const cleanImageRef = (u: string | null | undefined) => { const v = (u ?? "").trim(); return isMediaPath(v) || /^https:\/\//i.test(v) ? v : ""; };
export const mediaSrc = (u: string, w?: number) => (isMediaPath(u) && w ? `${u}?w=${w}` : u);
export const mediaSrcSet = (u: string) => (isMediaPath(u) ? [480, 800, 1200, 1600].map((w) => `${u}?w=${w} ${w}w`).join(", ") : undefined);
