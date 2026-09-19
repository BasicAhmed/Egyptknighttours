import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  serverExternalPackages: ["@libsql/client", "libsql", "bcryptjs", "@react-pdf/renderer", "sharp"],
  outputFileTracingIncludes: { "/**": ["./src/pdf/assets/**"] },
  images: { formats: ["image/avif", "image/webp"] },
  webpack(config) { config.resolve.alias["@"] = path.join(root, "src"); return config; },
};
