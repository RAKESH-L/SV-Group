"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LightHeroArtwork, SiteTheme, SiteLogo } from "@/lib/site-theme";
import { LightArtworkChoices } from "@/components/light-artwork-choices";

export function SiteThemeSettings() {
  const router = useRouter();
  const [published, setPublished] = useState<SiteTheme>("dark");
  const [choice, setChoice] = useState<SiteTheme>("dark");
  const [artwork, setArtwork] = useState<LightHeroArtwork>("crackers");
  const [publishedArtwork, setPublishedArtwork] = useState<LightHeroArtwork>("crackers");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [publishedHeroImageUrl, setPublishedHeroImageUrl] = useState<string | null>(null);
  const [logo, setLogo] = useState<SiteLogo>("ganesh");
  const [publishedLogo, setPublishedLogo] = useState<SiteLogo>("ganesh");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/site-theme", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 401 ? "Please sign in again." : "Could not load published theme.");
        return response.json() as Promise<{ theme: SiteTheme; lightHeroArtwork?: LightHeroArtwork; logo?: SiteLogo; heroImageUrl?: string | null }>;
      })
      .then(result => {
        if (mounted) { setPublished(result.theme); setChoice(result.theme); setArtwork(result.lightHeroArtwork === "diya" || result.lightHeroArtwork === "deepavali" ? result.lightHeroArtwork : "crackers"); setPublishedArtwork(result.lightHeroArtwork === "diya" || result.lightHeroArtwork === "deepavali" ? result.lightHeroArtwork : "crackers"); setHeroImageUrl(result.heroImageUrl || null); setPublishedHeroImageUrl(result.heroImageUrl || null); setLogo(result.logo === "diamond" ? "diamond" : "ganesh"); setPublishedLogo(result.logo === "diamond" ? "diamond" : "ganesh"); }
      })
      .catch(cause => { if (mounted) setError(cause instanceof Error ? cause.message : "Could not load published theme."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function publish() {
    setError(""); setMessage(""); setSaving(true);
    try {
      const response = await fetch("/api/admin/site-theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: choice, lightHeroArtwork: artwork, logo, heroImageUrl }),
      });
      const result = await response.json() as { error?: string; theme?: SiteTheme };
      if (!response.ok) throw new Error(result.error || "Could not publish selected theme.");
      setPublished(choice);
      setPublishedArtwork(artwork);
      setPublishedHeroImageUrl(heroImageUrl);
      setPublishedLogo(logo);
      document.documentElement.dataset.theme = choice;
      document.documentElement.dataset.logo = logo;
      setMessage(`Appearance published: ${choice === "light" ? "Festive Light" : "Classic Dark"}, ${artwork === "crackers" ? "Festive Firecracker Box" : artwork === "diya" ? "Traditional Diyas" : "Happy Deepavali"} artwork, and ${logo === "ganesh" ? "Ganesh" : "Original Diamond"} logo. Refresh the homepage to see your design.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish theme.");
    } finally { setSaving(false); }
  }

  return (
    <section className="admin-panel theme-admin-panel">
      <div className="theme-admin-intro">
        <div className="theme-admin-heading"><Palette size={25} aria-hidden="true"/><div><h2>Website Appearance</h2><p>Choose the one theme all visitors see at the same production URL. Only signed-in admins can publish a change.</p></div></div>
        <p className="theme-published-status" role="status">Current published theme: <strong>{published === "dark" ? "Classic Dark" : "Festive Light"}</strong> · Logo: <strong>{publishedLogo === "ganesh" ? "Ganesh" : "Original Diamond"}</strong></p>
      </div>
      {loading ? <p role="status">Loading your theme settings…</p> : (
        <>
          <div className="theme-admin-options" role="group" aria-label="Select website theme">
            <button type="button" className={`theme-option theme-option-dark ${choice === "dark" ? "selected" : ""}`} onClick={() => setChoice("dark")} aria-pressed={choice === "dark"}>
              <span className="theme-option-preview"><span className="theme-option-mini-head">SV GROUPS</span><span className="theme-option-mini-heading">Your celebration.</span><span className="theme-option-mini-button">Explore collection</span></span>
              <span className="theme-option-label"><Moon size={17}/><strong>Classic Dark</strong>{choice === "dark" && <Check size={17}/>}</span>
              <small>Original black, bronze and gold design. Existing website appearance.</small>
            </button>
            <button type="button" className={`theme-option theme-option-light ${choice === "light" ? "selected" : ""}`} onClick={() => setChoice("light")} aria-pressed={choice === "light"}>
              <span className="theme-option-preview"><span className="theme-option-mini-head">THE SEASON OF LIGHT</span><span className="theme-option-mini-heading">A little wonder.</span><span className="theme-option-mini-button">Explore collection</span></span>
              <span className="theme-option-label"><Sun size={17}/><strong>Festive Light</strong>{choice === "light" && <Check size={17}/>}</span>
              <small>Warm ivory, forest green and terracotta with gentle festive illustrations and animations.</small>
            </button>
          </div>
          <LightArtworkChoices artwork={artwork} publishedArtwork={publishedArtwork} heroImageUrl={heroImageUrl} onChange={setArtwork}/>
          <div className="approved-hero-upload">
            <div>
              <h3>Approved Happy Deepavali artwork</h3>
              <p>The approved Ganesha-and-mandala PNG is managed by the website. There is no file upload step. Its original colours, lettering and brightness are preserved; only the hero illustration changes when you switch designs.</p>
            </div>
            {heroImageUrl
              ? <figure className="approved-hero-preview">
                  <img src={heroImageUrl} alt="Your approved Happy Deepavali illustration with Ganesha emblem, mandala, diyas and celebration quote" loading="lazy"/>
                  <figcaption>Approved image ready. You can switch between Happy Deepavali, the Firecracker Box and Traditional Diyas whenever you choose.</figcaption>
                </figure>
              : <p className="form-status error" role="alert">The approved image has not yet been found in existing image storage. Earlier illustrations remain available while this is resolved.</p>}
          </div>
          <div className="site-logo-admin-section">
            <div className="site-logo-admin-intro"><h3>Website logo</h3><p>Select which emblem appears beside SV GROUPS in the header, homepage, and footer. The browser icon will match. Both are transparent SVGs and work with either theme.</p></div>
            <div className="site-logo-options" role="group" aria-label="Select the published website logo">
              {(["ganesh", "diamond"] as const).map(option => <button key={option} type="button" className={`site-logo-option ${logo === option ? "selected" : ""}`} aria-pressed={logo === option} onClick={() => setLogo(option)}>
                <span className="site-logo-option-visual" aria-hidden="true"><span className={`site-logo-preview-mark ${option}`} /><span className="site-logo-preview-name">SV <b>GROUPS</b></span></span>
                <span className="site-logo-option-label"><strong>{option === "ganesh" ? "Ganesh Logo" : "Original Diamond Logo"}</strong>{logo === option && <Check size={17} aria-hidden="true"/>}</span>
                <small>{option === "ganesh" ? "Approved Ganesh design · vector SVG" : "Original sparkle and diamond-shaped design · vector SVG"}</small>
                {publishedLogo === option && <span className="site-logo-published-label">Currently published</span>}
              </button>)}
            </div>
          </div>
          <div className="theme-admin-actions">
            <button type="button" className="button button-gold" disabled={saving || (artwork === "deepavali" && !heroImageUrl) || (published === choice && publishedArtwork === artwork && publishedLogo === logo && publishedHeroImageUrl === heroImageUrl)} onClick={publish}>
              {saving ? "Publishing…" : published === choice && publishedArtwork === artwork && publishedLogo === logo && publishedHeroImageUrl === heroImageUrl ? "Appearance is published" : "Publish appearance & logo"}
            </button>
            <a href="/" target="_blank" rel="noreferrer" className="button button-outline">Preview public homepage</a>
          </div>
          <p className="theme-admin-note">Theme, selected hero illustration and logo are saved together on the server. The approved PNG is stored without colour modification and the original CSS/SVG illustrations remain preserved. No new upload is required to change designs. Either logo can be selected with either theme. Visitors may need to refresh to see changes; animations respect reduced-motion preferences.</p>
        </>
      )}
      {message && <p className="form-status" role="status">{message}</p>}
      {error && <p className="form-status error" role="alert">{error}</p>}
    </section>
  );
}
