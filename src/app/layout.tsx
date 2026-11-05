import type { Metadata } from "next";
import "./globals.css";
import "./light-theme.css";
import "./promo-carousel.css";
import "./hero-artwork.css";
import "./analytics-dashboard.css";
import "./analytics-orders.css";
import "./poster-studio.css";
import "./catalogue-search.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/components/cart-provider";
import { PublicVisitTracker } from "@/components/public-visit-tracker";
import { getPublishedSiteTheme } from "@/lib/site-theme";
import { connection } from "next/server";
export const metadata: Metadata = {
  title: "Sri Vinayaka Groups | Tumkur",
  description: "Explore the Sri Vinayaka Groups festive catalogue. Get in touch with our team in Tumkur, Karnataka.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sv-groups-catalogue.vercel.app"),
  icons: {
    icon: [{ url: "/branding/sv-groups-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
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
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { await connection(); const theme = await getPublishedSiteTheme(); return <html lang="en" data-theme={theme}><body><CartProvider><PublicVisitTracker/><Header/><div className="main-content">{children}</div><Footer/></CartProvider></body></html>; }
