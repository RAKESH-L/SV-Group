"use client";
import { Check, Flame, PartyPopper } from "lucide-react";
import type { LightHeroArtwork } from "@/lib/site-theme";
export function LightArtworkChoices({ artwork, publishedArtwork, onChange }: {
  artwork: LightHeroArtwork;
  publishedArtwork: LightHeroArtwork;
  onChange: (value: LightHeroArtwork) => void;
}) {
  return <section className="light-artwork-settings" aria-labelledby="light-artwork-heading">
    <h3 id="light-artwork-heading">Light Theme — Hero Illustration</h3>
    <p>Switch between the new firecracker box and the original diyas. Both are preserved, and the Dark Theme remains unchanged.</p>
    <p className="light-artwork-current">Published artwork: <strong>{publishedArtwork === "crackers" ? "Festive Firecracker Box" : "Traditional Diyas"}</strong></p>
    <div className="light-artwork-grid" role="group" aria-label="Choose the light-theme hero illustration">
      <button type="button" className={`light-artwork-option ${artwork === "crackers" ? "selected" : ""}`} aria-pressed={artwork === "crackers"} onClick={() => onChange("crackers")}>
        <span className="light-artwork-preview light-artwork-preview-crackers"><PartyPopper size={38} strokeWidth={1.5}/><span aria-hidden="true">✦ ✧ ✦</span><b>SV GROUPS</b></span>
        <span className="light-artwork-option-title"><strong>Festive Firecracker Box</strong>{artwork === "crackers" && <Check size={17} aria-hidden="true"/>}</span>
        <small>Colourful rockets, sparkles and a decorated SV Groups box inspired by your reference.</small>
      </button>
      <button type="button" className={`light-artwork-option ${artwork === "diya" ? "selected" : ""}`} aria-pressed={artwork === "diya"} onClick={() => onChange("diya")}>
        <span className="light-artwork-preview light-artwork-preview-diya"><Flame size={42} strokeWidth={1.5}/><span aria-hidden="true">✧ ✦ ✧</span><b>LIGHT & JOY</b></span>
        <span className="light-artwork-option-title"><strong>Traditional Diyas</strong>{artwork === "diya" && <Check size={17} aria-hidden="true"/>}</span>
        <small>The original glowing diya illustration remains available to restore anytime.</small>
      </button>
    </div>
  </section>;
}