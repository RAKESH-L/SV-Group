/**
 * The original SV Groups identity is drawn with SVG and real text so it stays
 * crisp at every screen size. No uploaded raster logo is used in the site UI.
 */
type SvGroupsWordmarkProps = {
  className?: string;
};

export function SvGroupsWordmark({ className = "" }: SvGroupsWordmarkProps) {
  return (
    <span className={`sv-wordmark ${className}`.trim()} aria-hidden="true">
      <svg
        className="sv-wordmark-emblem"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="32" cy="32" r="28.4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M31 13.7c.65 0 1.1.57 1.31 1.19l3.15 10.11 9.82 3.24c1.6.54 1.6 2.32 0 2.86l-9.82 3.24-3.15 10.11c-.45 1.51-2.17 1.51-2.62 0l-3.15-10.11-9.82-3.24c-1.6-.54-1.6-2.32 0-2.86l9.82-3.24 3.15-10.11c.2-.62.67-1.19 1.31-1.19Z"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinejoin="round"
        />
        <path
          d="M46.1 13.9v8.7M41.75 18.25h8.7"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
        <path
          d="m17.4 37.8 1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9-3.9-1.6 3.9-1.6 1.6-3.9Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sv-wordmark-text">
        <span className="sv-wordmark-sv">SV</span>
        <span className="sv-wordmark-groups">GROUPS</span>
      </span>
    </span>
  );
}
