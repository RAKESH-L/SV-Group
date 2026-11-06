import type { CSSProperties } from "react";

/**
 * Sky shots launch from BELOW the compact offer, then explode ABOVE its
 * border. Artwork is original and modelled on the colourful expanding rays,
 * glowing cores and flying particles in the supplied animated SVG references.
 *
 * Four staggered shots, ~90 vector primitives, no libraries / JS timers /
 * 400-600 KB reference uploads. CSS is responsible for the animation.
 *
 * The parent offer intentionally allows visible overflow; its text/button
 * are stacked above this pointer-events-none decoration.
 */
type SkyColor = "gold" | "coral" | "teal" | "lime";
type Shot = {
  x: number;
  burstY: number;
  launchY: number;
  flight: number;
  delay: number;
  color: SkyColor;
};

const shots: Shot[] = [
  { x: 67, burstY: 88, launchY: 345, flight: 257, delay: 0, color: "coral" },
  { x: 470, burstY: 101, launchY: 353, flight: 252, delay: -1.8, color: "teal" },
  { x: 384, burstY: 48, launchY: 346, flight: 298, delay: -3.6, color: "gold" },
  { x: 178, burstY: 144, launchY: 347, flight: 203, delay: -5.4, color: "lime" },
];

const spokes = Array.from({ length: 16 }, (_, index) => index * 22.5);
const sparkleAngles = Array.from({ length: 8 }, (_, index) => index * 45 + 12);

function ColourfulBurst() {
  return (
    <g className="hero-mini-sky-explosion">
      <circle className="hero-mini-sky-flash" r="13" fill="currentColor" opacity=".22"/>
      <circle className="hero-mini-sky-ring" r="31" stroke="currentColor" strokeWidth="1.3" strokeDasharray="4 8" fill="none"/>
      <g className="hero-mini-sky-spokes">
        {spokes.map((angle, index) => (
          <g key={angle} transform={`rotate(${angle})`}>
            {index % 2 === 0
              ? <path d="M-2 -11 Q-3 -21 -2 -32 L0 -54 L2 -32 Q3 -21 2 -11Z" fill="currentColor"/>
              : <path d="M0 -13 L-1.7 -28 L0 -39 L1.7 -28Z" fill="var(--sky-secondary)"/>}
          </g>
        ))}
      </g>
      <g className="hero-mini-sky-flying-dots">
        {sparkleAngles.map((angle, index) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <circle cy={index % 2 === 0 ? -58 : -49} r={index % 3 === 0 ? 3.2 : 2.2} fill="var(--sky-secondary)"/>
            {index % 2 === 0 && <path d="M0 -63 V-69 M-3 -66 H3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>}
          </g>
        ))}
      </g>
      <circle r="7.5" fill="var(--sky-secondary)" opacity=".94"/>
      <path d="M0 -15L4 -4L15 0L4 4L0 15L-4 4L-15 0L-4 -4Z" fill="currentColor"/>
      <circle r="2.1" fill="#fff8d9"/>
    </g>
  );
}

function SkyShot({ shot, index }: { shot: Shot; index: number }) {
  const vars = {
    "--sky-offset": `${shot.delay}s`,
    "--sky-flight": `-${shot.flight}px`,
  } as CSSProperties;

  return (
    <g className={`hero-mini-sky-shot hero-mini-sky-shot-${index + 1} hero-mini-sky-${shot.color}`} style={vars}>
      {/* Flight begins outside and BELOW the physical banner's bottom edge. */}
      <g transform={`translate(${shot.x} ${shot.launchY})`}>
        <g className="hero-mini-sky-rocket">
          <path d="M0 -9 Q3 -5 3 0 Q2 8 0 13 Q-2 8 -3 0 Q-3 -5 0 -9Z" fill="var(--sky-secondary)"/>
          <circle cy="-5" r="3" fill="currentColor"/>
          <path d="M0 13 Q-5 31 0 53 Q3 30 0 13Z" fill="currentColor" opacity=".55"/>
          <path d="M0 10 V58" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" opacity=".75"/>
          <path d="M0 15 V73" stroke="var(--sky-secondary)" strokeWidth=".8" strokeDasharray="8 8" strokeLinecap="round" opacity=".75"/>
          <circle cx="-5" cy="27" r="2" fill="var(--sky-secondary)"/>
          <circle cx="6" cy="40" r="1.6" fill="currentColor"/>
        </g>
      </g>
      {/* Explodes OVER the banner's upper edge after its visible ascent. */}
      <g transform={`translate(${shot.x} ${shot.burstY})`}>
        <ColourfulBurst/>
      </g>
    </g>
  );
}

export function HeroMiniSkyShots() {
  return (
    <svg
      className="hero-mini-sky-shots"
      viewBox="0 0 540 340"
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
    >
      <g className="hero-mini-sky-static-twinkles" fill="currentColor">
        <path d="M29 161l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
        <path d="M515 206l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>
        <path d="M295 65l2.2 5.5 5.5 2.2-5.5 2.2-2.2 5.5-2.2-5.5-5.5-2.2 5.5-2.2z"/>
        <circle cx="20" cy="125" r="2"/>
        <circle cx="517" cy="94" r="2"/>
        <circle cx="288" cy="205" r="1.8"/>
      </g>
      {shots.map((shot, index) => <SkyShot key={shot.color} shot={shot} index={index}/>)}
    </svg>
  );
}
