import { getSettings } from "@/lib/settings";
import { https } from "@/components/home/sections";

// "Website and booking system by Nino Techy". Shown on the website, admin and login. Name and link are set in Settings.
export default async function BuilderCredit({ prefix = "Website & booking system by", className = "", dark = true }: { prefix?: string; className?: string; dark?: boolean }) {
  const g = await getSettings(); if (g["builder.show"] === "0") return null;
  const name = g["builder.name"] || "Nino Techy"; const url = https(g["builder.url"]);
  const strong = dark ? "text-gold-500" : "text-ink";
  return <p className={className}>{prefix}{" "}{url ? <a href={url} target="_blank" rel="noopener" className={`font-bold underline decoration-gold-600 decoration-2 underline-offset-4 ${strong}`}>{name}</a> : <span className={`font-bold ${strong}`}>{name}</span>}</p>;
}
