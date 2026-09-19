import Scene, { sceneFor } from "./Scene";
// Shows a real photo when a URL exists, otherwise a brand illustration for the destination.
export default function SiteImage({ src, alt, destination, className = "" }: { src?: string | null; alt: string; destination?: string; className?: string }) {
  return (
    <div className={`overflow-hidden bg-gold-500/20 ${className}`}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        : <Scene kind={sceneFor(destination)} className="absolute inset-0 h-full w-full" />}
    </div>
  );
}
