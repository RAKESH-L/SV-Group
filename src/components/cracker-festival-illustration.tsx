import { useId } from "react";

/**
 * Vector recreation of the festive cracker-box reference supplied by the site owner.
 * Crisp at every viewport size and self-contained (no external images or requests).
 */
type RocketProps = { x: number; y: number; angle: number; scale: number; color: string; stripe: string };
function FestiveRocket({ x, y, angle, scale, color, stripe }: RocketProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path d="M0 1v142" stroke="#8b6a3c" strokeWidth="3" strokeLinecap="round"/>
      <path d="M-20-15V-116Q0-146 20-116V-15Z" fill={color} stroke="#8a4328" strokeWidth="2"/>
      <path d="M-20-15V-116Q-11-137 0-142V-15Z" fill="#fff1ca" opacity=".17"/>
      <path d="M-17-110L18-84V-66L-18-92ZM-18-58L18-31V-18L-18-43Z" fill={stripe} opacity=".88"/>
      <path d="M-21-20L-33 11L-19 3ZM20-20L33 11L19 3Z" fill="#d39a49" stroke="#8f4b30" strokeWidth="1.5"/>
      <path d="M-20-15Q0-6 20-15" stroke="#fff1c3" strokeOpacity=".85" strokeWidth="2"/>
      <path d="M-16-121Q0-143 16-121" stroke="#fff0ca" strokeOpacity=".85" strokeWidth="2"/>
      <path d="M-7-104v63" stroke="#fff7df" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round"/>
    </g>
  );
}

export function CrackerFestivalIllustration() {
  const id = useId().replace(/:/g, "");
  return (
    <div className="light-festival-illustration light-festival-crackers">
      <svg viewBox="0 0 680 620" role="img" aria-label="A colorful bouquet of festive rockets and sparklers rising from a decorated red and gold SV Groups box, with glowing stars">
        <defs>
          <radialGradient id={`cracker-bg-${id}`} cx="50%" cy="55%" r="68%">
            <stop stopColor="#fff8e9"/><stop offset=".7" stopColor="#f8edda"/><stop offset="1" stopColor="#eadbc1"/>
          </radialGradient>
          <radialGradient id={`cracker-halo-${id}`}>
            <stop stopColor="#ffe3a4" stopOpacity=".65"/><stop offset="1" stopColor="#ffe3a4" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id={`cracker-box-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#b73a29"/><stop offset=".55" stopColor="#941e25"/><stop offset="1" stopColor="#6c1b22"/>
          </linearGradient>
          <linearGradient id={`cracker-gold-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fff2be"/><stop offset=".36" stopColor="#f3c26b"/><stop offset=".72" stopColor="#c88739"/><stop offset="1" stopColor="#f9d990"/>
          </linearGradient>
          <linearGradient id={`cracker-foil-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fff4ca"/><stop offset=".5" stopColor="#f0bb64"/><stop offset="1" stopColor="#ad742e"/>
          </linearGradient>
          <filter id={`cracker-softglow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7"/>
          </filter>
        </defs>

        <rect width="680" height="620" fill={`url(#cracker-bg-${id})`}/>
        <circle cx="350" cy="281" r="264" fill={`url(#cracker-halo-${id})`}/>
        <circle cx="350" cy="280" r="230" stroke="#deb778" strokeOpacity=".21" strokeWidth="2"/>
        <circle cx="350" cy="280" r="195" stroke="#deb778" strokeOpacity=".19" strokeWidth="1.5"/>
        <path d="M48 415C151 362 211 382 272 339M417 353C503 350 565 311 640 281" stroke="#ddae69" strokeWidth="2" strokeDasharray="3 14" opacity=".45"/>

        <g className="cracker-twinkle" fill="#d7a24b">
          <path d="m76 175 7 18 18 7-18 7-7 18-7-18-18-7 18-7 7-18Z"/>
          <path d="m573 153 7 20 20 7-20 7-7 20-7-20-20-7 20-7 7-20Z"/>
          <path d="m609 364 5 12 12 5-12 5-5 12-5-12-12-5 12-5 5-12Z"/>
          <circle cx="135" cy="120" r="4"/><circle cx="523" cy="92" r="3"/><circle cx="95" cy="370" r="3"/>
          <circle cx="558" cy="294" r="4"/><circle cx="178" cy="270" r="2.5"/>
        </g>

        <g className="cracker-burst cracker-burst-left" transform="translate(173 190)" stroke="#db9c4a" strokeWidth="3" strokeLinecap="round">
          <path d="M0-43V-15M0 15V43M-43 0h28M15 0h28M-31-31l21 21M10 10l21 21M31-31L10-10M-10 10l-21 21"/>
          <circle r="6" fill="#ffe1a1" stroke="none"/>
        </g>
        <g className="cracker-burst cracker-burst-right" transform="translate(522 248)" stroke="#cf8547" strokeWidth="3" strokeLinecap="round">
          <path d="M0-42V-15M0 15V42M-42 0h27M15 0h27M-29-29l19 19M10 10l19 19M29-29L10-10M-10 10l-19 19"/>
          <circle r="5" fill="#ffe0a0" stroke="none"/>
        </g>

        <g className="cracker-sparkler" transform="translate(393 270)">
          <path d="M0 0L17 173" stroke="#9b6a3d" strokeWidth="4" strokeLinecap="round"/>
          <circle r="44" fill="#ffdb88" opacity=".3" filter={`url(#cracker-softglow-${id})`}/>
          <g stroke="#e5ad4c" strokeWidth="2.7" strokeLinecap="round">
            <path d="M0-50V-15M0 15V50M-50 0h35M15 0h35M-36-36l25 25M11 11l25 25M36-36L11-11M-11 11l-25 25"/>
          </g>
          <circle r="6" fill="#fff4bd"/>
        </g>

        <g className="cracker-rockets">
          <FestiveRocket x={240} y={363} angle={-24} scale={1.14} color="#e26b26" stripe="#245b92"/>
          <FestiveRocket x={294} y={374} angle={-12} scale={1.17} color="#215aa0" stripe="#eab65c"/>
          <FestiveRocket x={355} y={357} angle={2} scale={1.27} color="#cc5e24" stripe="#ffdd77"/>
          <FestiveRocket x={412} y={377} angle={17} scale={1.13} color="#6d449b" stripe="#f7bf63"/>
          <FestiveRocket x={457} y={388} angle={27} scale={1.03} color="#c14445" stripe="#ffd66c"/>
          <FestiveRocket x={326} y={392} angle={-6} scale={.83} color="#288679" stripe="#d9b15f"/>
          <FestiveRocket x={385} y={398} angle={14} scale={.8} color="#c85c6f" stripe="#ffdf97"/>
        </g>

        <g className="cracker-aurora" stroke="#f8c267" strokeLinecap="round">
          <path d="M208 176l-13-33M240 169l8-27M280 185l24-22M455 150l16-28M479 167l24-12" strokeWidth="3" opacity=".72"/>
          <circle cx="203" cy="133" r="3" fill="#e8a44b"/>
          <circle cx="489" cy="114" r="4" fill="#d98d46"/>
        </g>

        <ellipse cx="343" cy="541" rx="235" ry="27" fill="#795a38" opacity=".18"/>
        {/* The decorated outer lip, three-dimensional red box and golden trim. */}
        <path d="M180 391L218 371L490 367L457 397Z" fill={`url(#cracker-gold-${id})`} stroke="#b77e3b" strokeWidth="4"/>
        <path d="M457 397L490 367V508L457 543Z" fill="#7f2625" stroke="#dba85b" strokeWidth="5"/>
        <path d="M182 396L457 397V543L182 543Z" fill={`url(#cracker-box-${id})`} stroke="#dca454" strokeWidth="6"/>
        <path d="M198 412H440V527H198Z" stroke="#efb85f" strokeWidth="2.5" opacity=".8"/>
        <path d="M206 420H432V519H206Z" stroke="#f6d17e" strokeWidth="1" opacity=".34"/>
        <path d="M216 429l19 14-19 14 19 14-19 14M417 429l-19 14 19 14-19 14 19 14" stroke="#d39c53" strokeWidth="2" opacity=".68"/>
        <g transform="translate(319 462)">
          <circle r="31" fill="#7a2621" stroke={`url(#cracker-foil-${id})`} strokeWidth="3"/>
          <path d="M0-21 5-6 20 0 5 6 0 21-5 6-20 0-5-6Z" fill="none" stroke="#f7ce7d" strokeWidth="3.2" strokeLinejoin="round"/>
          <circle cx="19" cy="-18" r="3.5" fill="#f5d68a"/>
          <path d="M19-25v14m-7-7h14" stroke="#f6cf77" strokeWidth="2"/>
        </g>
        <text x="319" y="508" fill="#fff0c9" fontFamily="Arial, sans-serif" fontSize="23" fontWeight="800" letterSpacing="3" textAnchor="middle">SV GROUPS</text>
        <path d="M183 534H457" stroke="#ffe0a1" strokeWidth="5" strokeLinecap="round"/>

        <g className="cracker-confetti" fill="#eebf65">
          <circle cx="154" cy="435" r="4"/><circle cx="134" cy="466" r="2"/><circle cx="519" cy="417" r="4"/>
          <path d="m120 312 7 17 17 7-17 7-7 17-7-17-17-7 17-7 7-17Z"/>
          <path d="m550 407 5 13 13 5-13 5-5 13-5-13-13-5 13-5 5-13Z"/>
        </g>
      </svg>
      <div className="light-art-caption"><span>02 / THE CELEBRATION EDIT</span><span>A little sparkle, a lot of wonder.</span></div>
    </div>
  );
}
