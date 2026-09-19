import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChromeGate from "@/components/ChromeGate";
import { SITE } from "@/lib/format";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Egypt Knight Tours | Egypt tours, private trips and Nile cruises", template: "%s | Egypt Knight" },
  description: "Egypt tours planned by a local team: pyramids, Luxor, Aswan, Nile cruises and airport transfers. Clear prices, easy booking, WhatsApp support.",
  openGraph: { type: "website", siteName: "Egypt Knight Tours", images: ["/logo.webp"] },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

const orgLd = { "@context": "https://schema.org", "@type": "TravelAgency", name: "Egypt Knight Tours", url: SITE, logo: `${SITE}/logo.webp`, areaServed: "Egypt" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <ChromeGate><Header /></ChromeGate><main id="main">{children}</main><ChromeGate><Footer /></ChromeGate>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
    </body></html>
  );
}
