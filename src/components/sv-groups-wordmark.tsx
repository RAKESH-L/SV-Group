/**
 * SV Groups uses the admin-selected, transparent Ganesh or original Diamond vector as the
 * brand emblem everywhere this shared wordmark appears (header, hero, footer).
 * Both logos are authentic scalable SVG assets with transparent backgrounds.
 * CSS masking colours it to match the current site theme without raster assets.
 */
type SvGroupsWordmarkProps = {
  className?: string;
};

export function SvGroupsWordmark({ className = "" }: SvGroupsWordmarkProps) {
  return (
    <span className={`sv-wordmark ${className}`.trim()} aria-hidden="true">
      <span className="sv-wordmark-emblem sv-selected-emblem" aria-hidden="true" />
      <span className="sv-wordmark-text">
        <span className="sv-wordmark-sv">SV</span>
        <span className="sv-wordmark-groups">GROUPS</span>
      </span>
    </span>
  );
}
