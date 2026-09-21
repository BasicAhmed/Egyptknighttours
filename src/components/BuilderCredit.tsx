import { BUILDER_NAME, builderUrl } from "@/lib/builder";

// "Website & booking system by Nino Techy". Fixed in code: not an admin setting, so it can't be switched off from the staff panel.
export default function BuilderCredit({ prefix = "Website & booking system by", className = "", dark = true }: { prefix?: string; className?: string; dark?: boolean }) {
  const url = builderUrl(); const strong = dark ? "text-gold-500" : "text-ink";
  return <p className={className}>{prefix}{" "}{url ? <a href={url} target="_blank" rel="noopener" className={`font-bold underline decoration-gold-600 decoration-2 underline-offset-4 ${strong}`}>{BUILDER_NAME}</a> : <span className={`font-bold ${strong}`}>{BUILDER_NAME}</span>}</p>;
}
