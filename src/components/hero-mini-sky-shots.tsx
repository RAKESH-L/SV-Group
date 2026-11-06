/**
 * Tiny original SVG fireworks for the Compact Hero Offer.
 *
 * Inspired by the rising sky shots and radial spark bursts in the supplied
 * animated SVG references, but deliberately drawn from scratch. The reference
 * files are hundreds of KB each; this decoration needs no image download,
 * canvas, timer, client JavaScript, library, or network request.
 *
 * The animation is decorative only and CSS disables it for reduced motion.
 */
function SkyBurst({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="hero-mini-sky-burst" fill="none" stroke="currentColor" strokeLinecap="round">
        <path
          className="hero-mini-sky-rays"
          strokeWidth="1.75"
          d="M0-7v-13 M0 7v13 M-7 0h-13 M7 0h13 M-5-5l-9-9 M5 5l9 9 M5-5l9-9 M-5 5l-9 9"
        />
        <path
          className="hero-mini-sky-inner"
          strokeWidth="1.4"
          d="M0-2.5v-4 M0 2.5v4 M-2.5 0h-4 M2.5 0h4"
        />
        <circle className="hero-mini-sky-glow" r="3.25" fill="currentColor" stroke="none" />
        <circle cx="-22" cy="-5" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="16" cy="-18" r="1.35" fill="currentColor" stroke="none" />
        <circle cx="14" cy="18" r="1.45" fill="currentColor" stroke="none" />
        <circle cx="-15" cy="17" r="1.2" fill="currentColor" stroke="none" />
      </g>
    </g>
  );
}

function SkyShot({ x, launchY, burstY, variant }: { x: number; launchY: number; burstY: number; variant: "gold" | "green" | "rose" }) {
  return (
    <g className={`hero-mini-sky-shot hero-mini-sky-${variant}`}>
      <g transform={`translate(${x} ${launchY})`}>
        <g className="hero-mini-sky-rocket">
          <path d="M0 4v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".65" />
          <circle cy="1.5" r="2.4" fill="currentColor" />
        </g>
      </g>
      <SkyBurst x={x} y={burstY} />
    </g>
  );
}

export function HeroMiniSkyShots() {
  return (
    <svg
      className="hero-mini-sky-shots"
      viewBox="0 0 440 116"
      preserveAspectRatio="xMidYMid slice"
      focusable="false"
      aria-hidden="true"
    >
      <g className="hero-mini-sky-haze" fill="none" strokeLinecap="round">
        <path d="M315 115Q373 54 435 93" stroke="currentColor" strokeWidth=".8" strokeDasharray="3 9" />
        <path d="M355 116Q402 76 457 98" stroke="currentColor" strokeWidth=".8" opacity=".6" strokeDasharray="2 10" />
      </g>
      <SkyShot x={406} launchY={106} burstY={31} variant="gold" />
      <SkyShot x={344} launchY={112} burstY={26} variant="green" />
      <SkyShot x={36} launchY={108} burstY={24} variant="rose" />
      <g className="hero-mini-sky-twinkles" fill="currentColor">
        <path d="m379 70 2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
        <path d="m430 9 1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" />
        <circle cx="310" cy="102" r="1.5" />
        <circle cx="422" cy="108" r="1.5" />
        <circle cx="53" cy="93" r="1.5" />
      </g>
    </svg>
  );
}
