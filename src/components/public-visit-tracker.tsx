"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAnonymousVisitorId } from "@/lib/client-analytics-identity";

/** Privacy-aware, first-party page views. The same stable browser ID is also
 * used for optional PWA install-event de-duplication. No personal data sent.
 */
export function PublicVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === "/admin" || pathname.startsWith("/admin/")) return;
    const visitorId = getAnonymousVisitorId();
    if (!visitorId) return;

    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      body: JSON.stringify({ visitorId, path: pathname }),
    }).catch(() => {
      // Analytics failures must never interrupt the catalogue or forms.
    });
  }, [pathname]);

  return null;
}
