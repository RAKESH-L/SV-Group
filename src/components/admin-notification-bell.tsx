"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AdminNotificationFeed } from "@/lib/admin-notifications";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/components/admin-notification-centre";

/**
 * Private admin header bell. Polls only while the admin tab is open, and
 * refreshes immediately after inbox read/unread actions. No push services.
 */
export function AdminNotificationBell({ onOpen, active }: { onOpen: () => void; active: boolean }) {
  const router = useRouter();
  const [unread, setUnread] = useState<number | null>(null);
  const [unreadFailed, setUnreadFailed] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/notifications", {
      cache: "no-store", credentials: "same-origin", signal,
    });
    if (response.status === 401) { router.replace("/admin/login"); return; }
    if (!response.ok) return;
    const data = await response.json() as AdminNotificationFeed;
    if (!signal?.aborted) {
      setUnread(data.counts.unread);
      setUnreadFailed(data.counts.unreadFailed);
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(() => undefined);
    const onFocus = () => { if (document.visibilityState === "visible") void load().catch(() => undefined); };
    const interval = window.setInterval(onFocus, 60_000);
    window.addEventListener("focus", onFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onFocus);
    };
  }, [load]);

  return <button type="button" className={`admin-notification-bell ${active ? "active" : ""} ${unreadFailed ? "has-failures" : ""}`}
    onClick={onOpen} aria-label={`Open notification centre${unread === null ? "" : `, ${unread} unread`}${unreadFailed ? `, ${unreadFailed} failed email alerts` : ""}`}
    title={unread === null ? "Notification Centre" : `${unread} unread notifications`}
    aria-pressed={active}>
    <Bell size={19} aria-hidden="true"/>
    <span>Notifications</span>
    {unread !== null && unread > 0 && <span className="admin-notification-count">{unread > 99 ? "99+" : unread}</span>}
  </button>;
}
