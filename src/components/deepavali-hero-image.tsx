"use client";

import { useEffect, useState } from "react";

/**
 * Display the original approved artwork after background removal.
 * If the public conversion service is unavailable, the saved original
 * remains visible instead of showing an empty or broken hero.
 */
export function DeepavaliHeroImage({
  originalUrl,
  className,
  priority = false,
  preview = false,
  withQuote = false,
}: {
  originalUrl: string;
  className?: string;
  priority?: boolean;
  preview?: boolean;
  withQuote?: boolean;
}) {
  const [fallback, setFallback] = useState(false);
  useEffect(() => setFallback(false), [originalUrl]);
  const basename = originalUrl.split("/").pop()?.split("?")[0] || "approved";
  const processedUrl = `/api/hero-artwork/blended?revision=${encodeURIComponent(basename)}`;
  return <>
    <img
    src={fallback ? originalUrl : processedUrl}
    onError={() => { if (!fallback) setFallback(true); }}
    className={className}
    alt={preview ? "Happy Deepavali hero illustration preview without the original rectangular background" : "Happy Deepavali — gold Ganesha, festive mandala, decorative diyas and a joyful celebration quote"}
    width={1008}
    height={1073}
    decoding="async"
    loading={priority ? "eager" : "lazy"}
    fetchPriority={priority ? "high" : "auto"}
    />
    {withQuote && !fallback && <p className="deepavali-blended-quote">Light up your celebrations with<br/>joy, togetherness and a burst of happiness.</p>}
  </>;
}
