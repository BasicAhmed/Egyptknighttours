import Link from "next/link";
export default function NotFound() {
  return <div className="container-x py-24 text-center"><h1 className="h1">Lost in the desert?</h1><p className="mt-3 text-ink/70">That page doesn't exist, but Egypt is well worth finding.</p><Link href="/tours" className="btn btn-primary mt-6">Browse tours</Link></div>;
}
