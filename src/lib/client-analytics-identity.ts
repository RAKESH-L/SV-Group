/** Shared first-party anonymous visitor identity for optional site analytics.
 * The raw value never leaves the browser except in same-origin analytics POSTs.
 * The server HMAC-hashes it before storage. Respect privacy opt-outs.
 */
const STORAGE_KEY = "sv_anonymous_visitor_v1";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function allowsAnonymousAnalytics(): boolean {
  return typeof window !== "undefined"
    && navigator.doNotTrack !== "1"
    && navigator.doNotTrack !== "yes"
    && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl !== true;
}

export function getAnonymousVisitorId(): string | null {
  if (!allowsAnonymousAnalytics() || !window.crypto?.randomUUID) return null;
  try {
    const previous = window.localStorage.getItem(STORAGE_KEY);
    if (previous && UUID_V4.test(previous)) return previous;
    const next = window.crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    // Storage disabled: opt out rather than counting repeatedly.
    return null;
  }
}
