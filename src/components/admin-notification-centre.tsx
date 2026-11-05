"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Eye, EyeOff, FileText, Inbox, MailX, MessageSquareText, RefreshCw, Search, ArrowUpRight } from "lucide-react";
import type { AdminNotification, AdminNotificationFeed } from "@/lib/admin-notifications";

export const NOTIFICATIONS_CHANGED_EVENT = "sv-admin-notifications-changed";

type Filter = "all" | "unread" | "general" | "information" | "email_failed";
type ApiResponse = AdminNotificationFeed & { error?: string };
type Props = { onOpenSource: (item: AdminNotification) => void };

function dateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  } catch { return iso; }
}

function IconFor({ kind }: { kind: AdminNotification["kind"] }) {
  if (kind === "email_failed") return <MailX size={19} aria-hidden="true"/>;
  if (kind === "information") return <FileText size={19} aria-hidden="true"/>;
  return <MessageSquareText size={19} aria-hidden="true"/>;
}

export function AdminNotificationCentre({ onOpenSource }: Props) {
  const router = useRouter();
  const [feed, setFeed] = useState<AdminNotificationFeed | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/notifications", {
      cache: "no-store", credentials: "same-origin", signal,
    });
    if (response.status === 401) { router.replace("/admin/login"); return; }
    const payload = await response.json() as ApiResponse;
    if (!response.ok) throw new Error(payload.error || "Could not load notifications.");
    setFeed(payload);
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load your notification inbox."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load().catch(() => undefined);
      }
    }, 60_000);
    return () => { controller.abort(); window.clearInterval(poll); };
  }, [load]);

  async function refresh() {
    setRefreshing(true); setError(""); setNotice("");
    try { await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not refresh notifications."); }
    finally { setRefreshing(false); setLoading(false); }
  }

  async function change(action: "read" | "unread" | "read-all", id?: string) {
    setActionId(id || "all"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "read-all" ? { action } : { action, id }),
      });
      if (response.status === 401) { router.replace("/admin/login"); return; }
      const payload = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "Could not update notification.");
      setFeed(payload);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      setNotice(action === "read-all" ? "All recent notifications marked as read." : action === "read" ? "Notification marked as read." : "Notification marked as unread.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this notification.");
    } finally { setActionId(null); }
  }

  function open(item: AdminNotification) {
    if (!item.readAt) void change("read", item.id);
    onOpenSource(item);
  }

  const visible = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (feed?.items || []).filter(item =>
      (filter === "all" || (filter === "unread" ? item.readAt === null : item.kind === filter))
      && words.every(word => [item.title, item.description, item.reference || ""].join(" ").toLowerCase().includes(word)),
    );
  }, [feed, filter, query]);

  return <section className="admin-notification-centre" aria-labelledby="notifications-title">
    <div className="admin-notification-header">
      <div>
        <span className="admin-notification-eyebrow"><Bell size={15} aria-hidden="true"/> PRIVATE ADMIN ALERTS</span>
        <h2 id="notifications-title">Notification <em>Centre.</em></h2>
        <p>New enquiries, product-information requests and email-delivery failures, together in one inbox.</p>
      </div>
      <button className="button button-outline" type="button" disabled={loading || refreshing || actionId !== null} onClick={() => void refresh()}>
        <RefreshCw size={16} className={refreshing ? "analytics-spinning" : ""}/> Refresh
      </button>
    </div>

    {loading && <p className="notification-feedback" role="status">Loading notifications…</p>}
    {error && <p className="notification-error" role="alert">{error}</p>}
    {notice && <p className="notification-success" role="status">{notice}</p>}

    {feed && <>
      <div className="notification-metrics">
        <div><span><Bell size={17}/> Unread alerts</span><strong>{feed.counts.unread}</strong><small>Waiting for your review</small></div>
        <div><span><MessageSquareText size={17}/> General enquiries</span><strong>{feed.counts.general}</strong><small>Received in the last {feed.periodDays} days</small></div>
        <div><span><FileText size={17}/> Product enquiries</span><strong>{feed.counts.information}</strong><small>Information requests received</small></div>
        <div className={feed.counts.unreadFailed ? "notification-metric-warning" : ""}><span><AlertTriangle size={17}/> Failed email alerts</span><strong>{feed.counts.emailFailed}</strong><small>{feed.counts.unreadFailed} unread · retry from Information Requests</small></div>
      </div>

      <div className="notification-filterbar">
        <label className="notification-search"><Search size={18} aria-hidden="true"/>
          <input type="search" aria-label="Search admin notifications" placeholder="Search names, messages or reference…" value={query} onChange={event => setQuery(event.target.value)} maxLength={100}/>
        </label>
        <div className="notification-tabs" role="group" aria-label="Notification filters">
          {([
            ["all", "All"], ["unread", "Unread"], ["general", "General"], ["information", "Information"], ["email_failed", "Email failures"],
          ] as const).map(([value, label]) => <button type="button" key={value}
            className={filter === value ? "selected" : ""} aria-pressed={filter === value}
            onClick={() => setFilter(value)}>{label}</button>)}
        </div>
      </div>
      <div className="notification-list-toolbar">
        <span><strong>{visible.length}</strong> shown · {feed.counts.all} recent alerts</span>
        <button type="button" className="notification-mark-all" disabled={feed.counts.unread === 0 || actionId !== null}
          onClick={() => void change("read-all")}><CheckCheck size={16}/> Mark all as read</button>
      </div>

      <div className="notification-list">
        {visible.map(item => <article key={item.id}
          className={`notification-item ${item.readAt ? "is-read" : "is-unread"} ${item.kind === "email_failed" ? "is-warning" : ""}`}>
          <span className={`notification-kind-icon ${item.kind}`}><IconFor kind={item.kind}/></span>
          <div className="notification-item-content">
            <div className="notification-item-top">
              <strong>{item.title}</strong>
              {!item.readAt && <span className="notification-unread-pill"><span aria-hidden="true"/> Unread</span>}
              {item.kind === "email_failed" && <span className="notification-warning-pill">Needs attention</span>}
            </div>
            <p>{item.description}</p>
            <small>{dateTime(item.createdAt)} IST</small>
          </div>
          <div className="notification-item-actions">
            <button type="button" className="notification-open" onClick={() => open(item)} disabled={actionId !== null}>
              Open {item.sourceTab === "enquiries" ? "enquiry" : "request"} <ArrowUpRight size={14}/>
            </button>
            <button type="button" className="notification-read-action" disabled={actionId !== null}
              onClick={() => void change(item.readAt ? "unread" : "read", item.id)}>
              {item.readAt ? <><EyeOff size={14}/> Mark unread</> : <><Eye size={14}/> Mark read</>}
            </button>
          </div>
        </article>)}
        {!visible.length && <div className="notification-empty">
          {feed.counts.all === 0 ? <CheckCircle2 size={29} aria-hidden="true"/> : <Inbox size={29} aria-hidden="true"/>}
          <h3>{feed.counts.all === 0 ? "No notifications yet" : "No matching notifications"}</h3>
          <p>{feed.counts.all === 0 ? "General enquiries, product requests and failed email alerts will appear here automatically." : "Try another filter or a different search."}</p>
          {(filter !== "all" || query !== "") && <button type="button" className="button button-outline"
            onClick={() => { setFilter("all"); setQuery(""); }}>Show all alerts</button>}
        </div>}
      </div>
      <p className="notification-disclaimer">
        Showing the latest {feed.periodDays} days (up to 200 general and 200 product-information requests). Read/unread status is private to your admin account. Opening an enquiry marks its notification as read, but never changes the enquiry status. Failed email alerts disappear when email delivery succeeds or the request is deleted. This page refreshes automatically every minute while open; browser push notifications are not enabled.
      </p>
    </>}
  </section>;
}
