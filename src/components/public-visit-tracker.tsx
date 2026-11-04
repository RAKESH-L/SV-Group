"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_STORAGE_KEY = "sv_anonymous_visitor_v1";

/**
 * Anonymous, first-party event counter. The ID is generated randomly in the
 * browser and stored locally; no IP, user agent or query parameters are sent.
 * Visitors who enable Do Not Track or Global Privacy Control are not tracked.
 */
export function PublicVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === "/admin" || pathname.startsWith("/admin/")) return;
    if (navigator.doNotTrack === "1" || navigator.doNotTrack === "yes") return;
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return;
    if (!window.crypto?.randomUUID) return;
    let visitorId: string;
    try {
      const stored = window.localStorage.getItem(VISITOR_STORAGE_KEY);
      const valid = stored && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored);
      if (valid) visitorId = stored;
      else {
        visitorId = window.crypto.randomUUID();
        window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
      }
    } catch {
      // Browser may disable all local storage; do not persist or track.
      return;
    }
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      body: JSON.stringify({ visitorId, path: pathname }),
    }).catch(() => {
      // Tracking failure must never interrupt catalogue, calculator or forms.
    });
  }, [pathname]);

  return null;
}
