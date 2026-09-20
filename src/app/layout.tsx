import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChromeGate from "@/components/ChromeGate";
import ConsoleBadge from "@/components/ConsoleBadge";
import { SITE } from "@/lib/format";

const inter = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", display: "swap", weight: "100 900" });
const bricolage = localFont({ src: "./fonts/bricolage-grotesque-latin-wght-normal.woff2", variable: "--font-display", display: "swap", weight: "200 800" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Egypt Knight Tours | Egypt Tours, Private Trips & Nile Cruises", template: "%s | Egypt Knight" },
  description: "Egypt tours planned by a local team: pyramids, Luxor, Aswan, Nile cruises and airport transfers. Clear prices, easy booking, WhatsApp support.",
  openGraph: { type: "website", siteName: "Egypt Knight Tours" },
  applicationName: "Egypt Knight Tours", generator: "Nino Techy Platform", creator: "Nino Techy", authors: [{ name: "Nino Techy" }], publisher: "Egypt Knight Tours",
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`}><body>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <ChromeGate><Header /></ChromeGate><ConsoleBadge /><main id="main">{children}</main><ChromeGate><Footer /></ChromeGate>
      
    </body></html>
  );
}
