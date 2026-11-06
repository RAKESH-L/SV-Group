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
  const [uploadingHero, setUploadingHero] = useState(false);
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

  async function uploadApprovedHero(file: File) {
    setError(""); setMessage("");
    if (file.type !== "image/png" || file.size < 64 || file.size > 4 * 1024 * 1024) {
      setError("Please select the exact approved PNG image (maximum 4 MB)."); return;
    }
    setUploadingHero(true);
    try {
      const body = new FormData(); body.append("image", file, file.name);
      const result = await fetch("/api/admin/hero-artwork-upload", { method: "POST", body, credentials: "same-origin" });
      const payload = await result.json() as { url?: string; error?: string };
      if (!result.ok || !payload.url) throw new Error(payload.error || "Could not upload the approved PNG.");
      setHeroImageUrl(payload.url); setArtwork("deepavali");
      setMessage("Approved PNG uploaded unchanged. Click Publish appearance & logo to activate this illustration for website visitors.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload the approved PNG.");
    } finally { setUploadingHero(false); }
  }

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
            <div><h3>Approved Deepavali artwork</h3><p>Upload the exact, approved Happy Deepavali PNG. It is stored without changing brightness, saturation, colours, quality or typography. Uploading does not publish it until you click Publish below.</p></div>
            <label className="approved-hero-upload-control">Choose approved PNG
              <input type="file" accept="image/png,.png" disabled={uploadingHero || saving} onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void uploadApprovedHero(file); event.currentTarget.value = ""; }}/>
            </label>
            {uploadingHero && <span role="status" className="approved-hero-progress">Uploading original artwork…</span>}
            {heroImageUrl && <figure className="approved-hero-preview"><img src={heroImageUrl} alt="Approved Happy Deepavali illustration currently available for publishing"/><figcaption>Approved PNG ready · original colours preserved. You can switch back to either earlier hero at any time.</figcaption></figure>}
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
            <button type="button" className="button button-gold" disabled={saving || uploadingHero || (artwork === "deepavali" && !heroImageUrl) || (published === choice && publishedArtwork === artwork && publishedLogo === logo && publishedHeroImageUrl === heroImageUrl)} onClick={publish}>
              {saving ? "Publishing…" : published === choice && publishedArtwork === artwork && publishedLogo === logo && publishedHeroImageUrl === heroImageUrl ? "Appearance is published" : "Publish appearance & logo"}
            </button>
            <a href="/" target="_blank" rel="noreferrer" className="button button-outline">Preview public homepage</a>
          </div>
          <p className="theme-admin-note">Theme, selected hero illustration, approved PNG URL, and logo are saved together on the server. The original two CSS/SVG hero illustrations are permanently preserved in code. Either logo can be selected with either theme. Visitors may need to refresh to see changes; animations respect reduced-motion preferences.</p>
        </>
      )}
      {message && <p className="form-status" role="status">{message}</p>}
      {error && <p className="form-status error" role="alert">{error}</p>}
    </section>
  );
}
