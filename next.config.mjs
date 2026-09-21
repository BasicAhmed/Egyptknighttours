import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));

// Content Security Policy. Inline scripts are needed by Next.js and JSON-LD; everything else is locked to this site,
// plus YouTube (video), Google Maps (map) and https images that staff paste or upload.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.google.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const security = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  compress: true,
  // Always put the page title and description in the HTML <head> (not streamed later), for every crawler and social preview.
  htmlLimitedBots: /.*/,
  serverExternalPackages: ["@libsql/client", "libsql", "bcryptjs", "@react-pdf/renderer", "sharp", "unpdf"],
  // The PDF library loads its font and data files at run time, which Vercel cannot detect on its own.
  outputFileTracingIncludes: { "/**/*": ["./node_modules/pdfkit/js/**/*", "./node_modules/fontkit/dist/**/*", "./node_modules/linebreak/**/*", "./node_modules/unicode-properties/**/*", "./node_modules/@react-pdf/**/*"] },
  ...(process.env.TRACE_CHECK ? { output: "standalone" } : {}),
  images: { formats: ["image/avif", "image/webp"] },
  webpack(config) { config.resolve.alias["@"] = path.join(root, "src"); return config; },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    // Public pages are the same for every visitor, so the CDN may keep them for 2 minutes and refresh in the background.
    // Pages with personal content (track, book, booking, admin, api) are deliberately left out.
    const edge = [{ key: "Cache-Control", value: "public, max-age=0, s-maxage=120, stale-while-revalidate=600" }];
    const publicPages = ["/", "/tours", "/tours/:slug", "/destinations", "/destinations/:slug", "/egypt-travel-guide", "/egypt-travel-guide/:slug", "/egypt-tours/:slug", "/faq", "/contact", "/plan-my-trip", "/terms", "/privacy-policy"];
    return [
      ...publicPages.map((source) => ({ source, headers: edge })),
      { source: "/:path*", headers: security },
      { source: "/admin/:path*", headers: noindex },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/track/:path*", headers: noindex }, { source: "/booking/:path*", headers: noindex }, { source: "/book/:path*", headers: noindex },
    ];
  },
  async redirects() {
    return [{ source: "/egypt-travel-guide/giza-pyramids-visitor-guide", destination: "/egypt-travel-guide/egypt-pyramids-guide", permanent: true }];
  },
};
