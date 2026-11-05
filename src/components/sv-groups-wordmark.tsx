/**
 * SV Groups uses the customer-approved, transparent Ganesh vector as the
 * brand emblem everywhere this shared wordmark appears (header, hero, footer).
 * The SVG is a real traced vector at /branding/ganesh-approved.svg.
 * CSS masking colours it to match the current site theme without raster assets.
 */
type SvGroupsWordmarkProps = {
  className?: string;
};

export function SvGroupsWordmark({ className = "" }: SvGroupsWordmarkProps) {
  return (
    <span className={`sv-wordmark ${className}`.trim()} aria-hidden="true">
      <span className="sv-wordmark-emblem sv-ganesh-emblem" aria-hidden="true" />
      <span className="sv-wordmark-text">
        <span className="sv-wordmark-sv">SV</span>
        <span className="sv-wordmark-groups">GROUPS</span>
      </span>
    </span>
  );
}
