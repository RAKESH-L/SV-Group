"use client";
import { Check, Flame, PartyPopper, Flower2 } from "lucide-react";
import type { LightHeroArtwork } from "@/lib/site-theme";
export function LightArtworkChoices({ artwork, publishedArtwork, heroImageUrl, onChange }: {
  artwork: LightHeroArtwork;
  publishedArtwork: LightHeroArtwork;
  heroImageUrl?: string | null;
  onChange: (value: LightHeroArtwork) => void;
}) {
  return <section className="light-artwork-settings" aria-labelledby="light-artwork-heading">
    <h3 id="light-artwork-heading">Light Theme — Hero Illustration</h3>
    <p>Choose between all three illustrations: the existing Firecracker Box, original Diyas, or your approved Happy Deepavali artwork. The earlier illustrations remain untouched and can be restored whenever you want.</p>
    <p className="light-artwork-current">Published artwork: <strong>{publishedArtwork === "crackers" ? "Festive Firecracker Box" : publishedArtwork === "diya" ? "Traditional Diyas" : "Happy Deepavali — Approved"}</strong></p>
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
      <button type="button" className={`light-artwork-option ${artwork === "deepavali" ? "selected" : ""}`} aria-pressed={artwork === "deepavali"} onClick={() => onChange("deepavali")}>
        <span className="light-artwork-preview light-artwork-preview-deepavali">
          {heroImageUrl ? <img src={heroImageUrl} alt="Approved Happy Deepavali hero preview" loading="lazy"/> :
            <><Flower2 size={42} strokeWidth={1.5}/><span>Happy Deepavali</span><b>UPLOAD APPROVED PNG</b></>}
        </span>
        <span className="light-artwork-option-title"><strong>Happy Deepavali — Approved</strong>{artwork === "deepavali" && <Check size={17} aria-hidden="true"/>}</span>
        <small>Gold Ganesha emblem, ornamented mandala, diyas and celebration quote. The original PNG is displayed without brightening or recolouring. {heroImageUrl ? "Ready to publish." : "Upload your approved PNG below before publishing."}</small>
      </button>
    </div>
  </section>;
}