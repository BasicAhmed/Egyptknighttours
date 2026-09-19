import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  // The PDF library loads its font and data files at run time, which Vercel cannot detect on its own.
  outputFileTracingIncludes: { "/**/*": ["./node_modules/pdfkit/js/**/*", "./node_modules/fontkit/dist/**/*", "./node_modules/linebreak/**/*", "./node_modules/unicode-properties/**/*", "./node_modules/@react-pdf/**/*"] },
  ...(process.env.TRACE_CHECK ? { output: "standalone" } : {}),
  serverExternalPackages: ["@libsql/client", "libsql", "bcryptjs", "@react-pdf/renderer", "sharp"],
  images: { formats: ["image/avif", "image/webp"] },
  webpack(config) { config.resolve.alias["@"] = path.join(root, "src"); return config; },
};
