import type { MetadataRoute } from "next";
import { SITE } from "@/lib/format";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/booking", "/book", "/track"] }], sitemap: `${SITE}/sitemap.xml` };
}
