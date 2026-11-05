import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PwaInstallPanel } from "@/components/pwa-install-panel";
import { T } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "Install SV Groups | Sri Vinayaka Groups",
  description: "Add Sri Vinayaka Groups to your Android, iPhone, iPad or desktop home screen as an installable web app.",
};

export default function InstallPage() {
  return <main className="pwa-install-page">
    <div className="pwa-install-topline"><Sparkles size={16} aria-hidden="true"/> <T text="SRI VINAYAKA GROUPS · TUMKUR"/></div>
    <h1><T text="Your SV Groups website, now app-ready."/></h1>
    <p className="pwa-install-lede"><T text="Explore the catalogue in an app-like experience, right from your device's home screen."/></p>
    <PwaInstallPanel/>
    <Link className="pwa-install-back" href="/"><ArrowLeft size={16} aria-hidden="true"/> <T text="Back to website"/></Link>
  </main>;
}
