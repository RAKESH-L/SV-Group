import type { Metadata } from "next";
import "./globals.css";
import "./light-theme.css";
import "./promo-carousel.css";
import "./hero-artwork.css";
import "./analytics-dashboard.css";
import "./advanced-product-analytics.css";
import "./admin-notifications.css";
import "./inventory-dashboard.css";
import "./analytics-orders.css";
import "./poster-studio.css";
import "./catalogue-search.css";
import "./language.css";
import "./ganesh-branding.css";
import "./site-logo-options.css";
import "./pwa-install.css";
import "./hero-mini-offer.css";
import { Header } from "@/components/header";
import { LanguageProvider } from "@/components/language-provider";
import { PwaProvider } from "@/components/pwa-provider";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/components/cart-provider";
import { PublicVisitTracker } from "@/components/public-visit-tracker";
import { getPublishedSiteTheme, getPublishedSiteLogo } from "@/lib/site-theme";
import { connection } from "next/server";
export async function generateMetadata(): Promise<Metadata> {
  const logo = await getPublishedSiteLogo();
  return {
  title: "Sri Vinayaka Groups | Tumkur",
  description: "Explore the Sri Vinayaka Groups festive catalogue. Get in touch with our team in Tumkur, Karnataka.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sv-groups-catalogue.vercel.app"),
  manifest: "/manifest.webmanifest",
  applicationName: "SV Groups",
  appleWebApp: { capable: true, title: "SV Groups", statusBarStyle: "default" },
  icons: {
    icon: [{ url: logo === "diamond" ? "/branding/diamond-original.svg" : "/branding/ganesh-approved.svg", type: "image/svg+xml" }],
    apple: [{ url: `/api/pwa/icon/180?logo=${logo}`, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Sri Vinayaka Groups | Tumkur",
    description: "Thoughtful festive favourites and friendly help for your celebration, from Tumkur, Karnataka.",
    siteName: "Sri Vinayaka Groups",
    type: "website",
    images: [{ url: "/branding/sv-logo-og.png", width: 1200, height: 630, alt: "Sri Vinayaka Groups official gold logo" }],
  },
  twitter: { card: "summary_large_image", title: "Sri Vinayaka Groups | Tumkur", images: ["/branding/sv-logo-og.png"] },
  };
}
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { await connection(); const [theme, logo] = await Promise.all([getPublishedSiteTheme(), getPublishedSiteLogo()]); return <html lang="en" data-theme={theme} data-logo={logo}><body><PwaProvider><LanguageProvider><CartProvider><PublicVisitTracker/><Header/><div className="main-content">{children}</div><Footer/></CartProvider></LanguageProvider></PwaProvider></body></html>; }
