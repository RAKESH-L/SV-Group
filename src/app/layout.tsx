import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
export const metadata: Metadata = { title: "SV Groups | A Brighter Celebration", description: "Explore the SV Groups festive catalogue and compare indicative prices. Informational catalogue only.", metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000") };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><Header/><div className="main-content">{children}</div><Footer/></body></html>; }
