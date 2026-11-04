"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LightHeroArtwork, SiteTheme } from "@/lib/site-theme";
import { LightArtworkChoices } from "@/components/light-artwork-choices";

export function SiteThemeSettings() {
  const router = useRouter();
  const [published, setPublished] = useState<SiteTheme>("dark");
  const [choice, setChoice] = useState<SiteTheme>("dark");
  const [artwork, setArtwork] = useState<LightHeroArtwork>("crackers");
  const [publishedArtwork, setPublishedArtwork] = useState<LightHeroArtwork>("crackers");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/site-theme", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 401 ? "Please sign in again." : "Could not load published theme.");
        return response.json() as Promise<{ theme: SiteTheme; lightHeroArtwork?: LightHeroArtwork }>;
      })
      .then(result => {
        if (mounted) { setPublished(result.theme); setChoice(result.theme); setArtwork(result.lightHeroArtwork === "diya" ? "diya" : "crackers"); setPublishedArtwork(result.lightHeroArtwork === "diya" ? "diya" : "crackers"); }
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
        body: JSON.stringify({ theme: choice, lightHeroArtwork: artwork }),
      });
      const result = await response.json() as { error?: string; theme?: SiteTheme };
      if (!response.ok) throw new Error(result.error || "Could not publish selected theme.");
      setPublished(choice);
      setPublishedArtwork(artwork);
      document.documentElement.dataset.theme = choice;
      setMessage(`Appearance published: ${choice === "light" ? "Festive Light" : "Classic Dark"} and ${artwork === "crackers" ? "Festive Firecracker Box" : "Traditional Diyas"} artwork. Refresh the homepage to see your design.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish theme.");
    } finally { setSaving(false); }
  }

  return (
    <section className="admin-panel theme-admin-panel">
      <div className="theme-admin-intro">
        <div className="theme-admin-heading"><Palette size={25} aria-hidden="true"/><div><h2>Website Appearance</h2><p>Choose the one theme all visitors see at the same production URL. Only signed-in admins can publish a change.</p></div></div>
        <p className="theme-published-status" role="status">Current published theme: <strong>{published === "dark" ? "Classic Dark" : "Festive Light"}</strong></p>
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
          <LightArtworkChoices artwork={artwork} publishedArtwork={publishedArtwork} onChange={setArtwork}/>
          <div className="theme-admin-actions">
            <button type="button" className="button button-gold" disabled={saving || (published === choice && publishedArtwork === artwork)} onClick={publish}>
              {saving ? "Publishing…" : published === choice && publishedArtwork === artwork ? "Appearance is published" : "Publish theme & illustration"}
            </button>
            <a href="/" target="_blank" rel="noreferrer" className="button button-outline">Preview public homepage</a>
          </div>
          <p className="theme-admin-note">Theme and Light Theme illustration are saved together on the server. The original diyas remain available anytime. Visitors may need to refresh to see changes; animations respect reduced-motion preferences.</p>
        </>
      )}
      {message && <p className="form-status" role="status">{message}</p>}
      {error && <p className="form-status error" role="alert">{error}</p>}
    </section>
  );
}
