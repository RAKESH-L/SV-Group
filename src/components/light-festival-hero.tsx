import Link from "next/link";
import { T } from "@/components/language-provider";
import { ArrowUpRight, Leaf, Sparkles } from "lucide-react";
import { CrackerFestivalIllustration } from "@/components/cracker-festival-illustration";
import type { LightHeroArtwork } from "@/lib/site-theme";
import type { MiniHeroOffer } from "@/lib/site-hero-mini-offer";
import { HeroMiniOffer } from "@/components/hero-mini-offer";

/** Illustration is CSS/SVG artwork, not an uploaded logo or an animation library. */
function FestivalIllustration() {
  return (
    <div className="light-festival-illustration">
      <svg viewBox="0 0 680 620" fill="none" role="img" aria-label="Two illustrated glowing diyas with twinkling festival stars">
        <defs>
          <radialGradient id="festival-glow" cx="0" cy="0" r="1" gradientTransform="translate(340 315) rotate(90) scale(340)">
            <stop stopColor="#668875"/>
            <stop offset="1" stopColor="#173d33"/>
          </radialGradient>
          <linearGradient id="festival-bowl" x1="300" y1="350" x2="320" y2="470" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f5b67e"/><stop offset=".58" stopColor="#d7794d"/><stop offset="1" stopColor="#af502f"/>
          </linearGradient>
          <linearGradient id="festival-flame" x1="300" y1="150" x2="330" y2="340" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff2b6"/><stop offset=".6" stopColor="#f6bf6a"/><stop offset="1" stopColor="#e69745"/>
          </linearGradient>
        </defs>
        <circle cx="340" cy="312" r="296" fill="url(#festival-glow)"/>
        <circle cx="340" cy="312" r="259" stroke="#e6c987" strokeOpacity=".2"/>
        <circle cx="340" cy="312" r="235" stroke="#e6c987" strokeOpacity=".15"/>
        <path d="M64 240c135 75 215 102 311 63 110-44 153-91 248-71M86 455c161-88 286-64 501-13" stroke="#f9d89b" strokeOpacity=".15"/>
        <g stroke="#f6cc75" strokeWidth="2.1" strokeLinecap="round" className="festival-rays">
          <path d="M340 82v53M238 107l25 47M437 103l-25 47M161 174l44 28M521 174l-45 29M132 293h53M548 293h-53"/>
        </g>
        <g fill="#f6cf84" className="festival-sparkles">
          <path d="m179 244 5 13 13 5-13 5-5 13-5-13-13-5 13-5 5-13Z"/>
          <path d="m501 340 7 16 16 7-16 7-7 16-7-16-16-7 16-7 7-16Z"/>
          <circle cx="122" cy="207" r="3"/><circle cx="547" cy="185" r="3"/><circle cx="523" cy="429" r="2"/><circle cx="169" cy="394" r="2.5"/>
        </g>
        <g className="festival-skyshot festival-skyshot-one"><path d="M111 427q90-100 173-218" stroke="#f8d49a" strokeWidth="3" strokeDasharray="5 12" strokeLinecap="round"/><circle cx="285" cy="208" r="4" fill="#ffe6aa"/></g>
        <g className="festival-skyshot festival-skyshot-two"><path d="M558 466q-66-92-93-210" stroke="#f8d49a" strokeWidth="3" strokeDasharray="4 15" strokeLinecap="round"/><circle cx="465" cy="256" r="4" fill="#ffe6aa"/></g>
        <g className="festival-burst festival-burst-one" stroke="#ffd98a" strokeWidth="2.5" strokeLinecap="round">
          <path d="M285 208v-21M285 208v21M264 208h-21M306 208h21M270 193l-12-12M300 223l12 12M300 193l12-12M270 223l-12 12"/>
        </g>
        <g className="festival-burst festival-burst-two" stroke="#ffd98a" strokeWidth="2" strokeLinecap="round">
          <path d="M465 256v-17M465 256v17M448 256h-17M482 256h17M453 244l-10-10M477 268l10 10M477 244l10-10M453 268l-10 10"/>
        </g>
        <ellipse cx="341" cy="502" rx="200" ry="22" fill="#09281f" opacity=".35"/>
        <g className="festival-diya-back">
          <ellipse cx="285" cy="325" rx="89" ry="19" fill="#f1a86f"/>
          <path d="M197 324q11 77 88 76t88-76q-79 32-176 0Z" fill="url(#festival-bowl)"/>
          <ellipse cx="285" cy="326" rx="74" ry="12" fill="#7b3c26"/>
          <path className="festival-flame-back" d="M285 229q-23 40-17 62c5 21 30 28 38 5 6-17-10-41-21-67Z" fill="url(#festival-flame)"/>
          <path d="M285 280q-9 17-5 25c4 9 13 10 15 0 2-6-5-17-10-25Z" fill="#fff5c5"/>
        </g>
        <g className="festival-diya-front">
          <ellipse cx="381" cy="436" rx="153" ry="37" fill="#f9b879"/>
          <path d="M228 437q18 88 153 96 136-8 153-96-147 64-306 0Z" fill="url(#festival-bowl)"/>
          <ellipse cx="381" cy="437" rx="133" ry="25" fill="#813e2b"/>
          <path className="festival-flame-front" d="M380 281c-5 35-49 77-49 113 0 38 25 60 49 70 28-20 51-39 51-72 0-37-39-82-51-111Z" fill="url(#festival-flame)"/>
          <path d="M380 369q-20 33-17 54c2 18 12 25 17 29 16-12 21-23 17-39-3-12-12-28-17-44Z" fill="#fff5c6"/>
          <path d="M255 464q117 82 254 0" stroke="#ffdaa0" strokeOpacity=".78" strokeWidth="3" strokeLinecap="round"/>
          <g fill="#f8cf91"><circle cx="290" cy="484" r="3"/><circle cx="332" cy="500" r="3"/><circle cx="380" cy="509" r="3"/><circle cx="430" cy="500" r="3"/><circle cx="475" cy="485" r="3"/></g>
        </g>
      </svg>
      <div className="light-art-caption"><span><T text="01 / THE FESTIVAL EDIT"/></span><span><T text="Light brings us together."/></span></div>
    </div>
  );
}

function ApprovedDeepavaliIllustration({ url }: { url: string }) {
  return (
    <div className="light-festival-illustration light-festival-deepavali">
      {/* Use the original uploaded PNG without colour filters, gradients,
          overlays or image transformations. The illustration itself includes
          its greeting, approved Ganesh emblem and message. */}
      <img
        src={url}
        alt="Happy Deepavali — ornamental floral mandala, approved gold Ganesha emblem, glowing diyas and a celebration greeting"
        width={1122}
        height={1402}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}

export function LightFestivalHero({ artwork = "crackers", offer, heroImageUrl }: {
  artwork?: LightHeroArtwork; offer: MiniHeroOffer; heroImageUrl?: string | null;
}) {
  return (
    <>
      <section className="light-festival-hero" aria-labelledby="light-festival-heading">
        <div className="light-festival-copy">
          <p className="light-festival-kicker"><span className="light-kicker-dot"/> <T text="THE SEASON OF LIGHT"/></p>
          <span className="light-festival-brand"><T text="SRI VINAYAKA GROUPS · TUMKUR"/></span>
          <h1 id="light-festival-heading"><T text="Make room"/><br/><T text="for a little"/><br/><em><T text="wonder."/></em></h1>
          <p className="light-festival-subtitle"><T text="Brighter evenings. Familiar faces. Moments that stay. Find inspiration for a thoughtful, joyful festive season."/></p>
          <Link className="light-festival-cta" href="#collection"><T text="Explore the collection"/> <ArrowUpRight size={22} aria-hidden="true"/></Link>
          <p className="light-festival-signoff"><Sparkles size={22} aria-hidden="true"/> <T text="Rooted in tradition. Celebrated with care."/></p>
        </div>
        <HeroMiniOffer offer={offer} className="light-hero-mini-offer"/>
        {artwork === "deepavali" && heroImageUrl ? <ApprovedDeepavaliIllustration url={heroImageUrl}/> : artwork === "diya" ? <FestivalIllustration/> : <CrackerFestivalIllustration/>}
      </section>
      <section className="light-festival-values" aria-label="Our approach">
        <span><Leaf size={18} aria-hidden="true"/> <T text="Celebrate thoughtfully"/></span>
        <span><Sparkles size={18} aria-hidden="true"/> <T text="Keep traditions alive"/></span>
        <span><Sparkles size={18} aria-hidden="true"/> <T text="Put safety first"/></span>
        <span><Leaf size={18} aria-hidden="true"/> <T text="Make memories together"/></span>
      </section>
    </>
  );
}
