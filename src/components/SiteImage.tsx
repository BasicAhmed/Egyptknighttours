import Scene, { sceneFor } from "./Scene";
import { mediaSrc, mediaSrcSet } from "@/lib/media";
// Shows a real photo when one exists, otherwise a brand illustration for the destination.
export default function SiteImage({ src, alt, destination, className = "", sizes = "(min-width: 1024px) 400px, 90vw", priority = false }: { src?: string | null; alt: string; destination?: string; className?: string; sizes?: string; priority?: boolean }) {
  return (
    <div className={`overflow-hidden bg-gold-500/20 ${className}`}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={mediaSrc(src, 800)} srcSet={mediaSrcSet(src)} sizes={sizes} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        : <Scene kind={sceneFor(destination)} className="absolute inset-0 h-full w-full" />}
    </div>
  );
}
