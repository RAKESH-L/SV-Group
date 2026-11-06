"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCircle2, RefreshCw, Send, Users } from "lucide-react";

type Campaign = {
  id: string; title: string; message: string; path: string;
  createdAt: string; sent: number; failed: number;
};
type Summary = { subscribers: number; recent: Campaign[]; error?: string };
type BroadcastRequest = { campaignId: string; title: string; message: string; path: string; cursor?: string };
type BroadcastResult = { sent: number; failed: number; skipped: number; batchSize: number; nextCursor: string | null; error?: string };
export function AdminPushNotifications() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [title, setTitle] = useState("Latest from Sri Vinayaka Groups");
  const [message, setMessage] = useState("Discover our updated catalogue and festive announcements.");
  const [path, setPath] = useState("/catalogue");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<BroadcastRequest | null>(null);
  const [totals, setTotals] = useState({ sent: 0, failed: 0, skipped: 0 });
  const [loading, setLoading] = useState(true);

  async function reload() {
    const response = await fetch("/api/admin/push", { cache: "no-store", credentials: "same-origin" });
    const data = await response.json() as Summary;
    if (!response.ok) throw new Error(data.error || "Could not fetch push subscribers.");
    setSummary(data);
  }
  useEffect(() => {
    let active = true;
    void fetch("/api/admin/push", { cache:"no-store", credentials:"same-origin" })
      .then(async response => {
        const data = await response.json() as Summary;
        if (!response.ok) throw new Error(data.error || "Could not fetch push settings.");
        if (active) setSummary(data);
      }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load notifications."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function sendBatch(value: BroadcastRequest) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/push", {
        method: "POST", headers: {"Content-Type":"application/json"}, credentials:"same-origin",
        body: JSON.stringify(value),
      });
      const data = await response.json() as BroadcastResult;
      if (!response.ok) throw new Error(data.error || "Notification batch could not be completed.");
      const next = {
        sent: totals.sent + data.sent, failed: totals.failed + data.failed,
        skipped: totals.skipped + data.skipped,
      };
      setTotals(next);
      setPending(data.nextCursor ? { ...value, cursor: data.nextCursor } : null);
      setNotice(data.nextCursor
        ? `Batch processed: ${data.sent} sent, ${data.failed} failed. Select Send next batch for remaining devices.`
        : `Broadcast completed: ${next.sent} accepted by push services, ${next.failed} failed, ${next.skipped} previously processed. This does not guarantee device display.`);
      await reload().catch(() => undefined);
    } catch (cause) {
      // Preserve campaign/cursor so a retry does not create a second campaign.
      setPending(value);
      setError(cause instanceof Error ? cause.message : "Unable to send this batch. Retry without changing the message.");
    } finally { setBusy(false); }
  }

  function start() {
    if (!summary?.subscribers || busy || pending) return;
    if (!window.confirm(`Send this announcement to ${summary.subscribers} opted-in browser(s)? The first batch can reach up to 50 devices.`)) return;
    setTotals({ sent: 0, failed: 0, skipped: 0 });
    void sendBatch({ campaignId: crypto.randomUUID(), title: title.trim(), message: message.trim(), path: path.trim() });
  }
  return <section className="sv-admin-push">
    <h2><Bell size={21} style={{display:"inline",verticalAlign:"middle"}}/> Customer Push Notifications</h2>
    <p>Send occasional opt-in browser/PWA announcements. Subscribers choose notifications themselves; they can unsubscribe on their devices. Never share private enquiry details or send unsolicited messages.</p>
    <div className="sv-admin-push-metrics">
      <div><strong>{loading ? "…" : summary?.subscribers ?? "—"}</strong><small><Users size={13} style={{display:"inline"}}/> Subscribed browsers</small></div>
      <div><strong>{summary?.recent.length ?? 0}</strong><small>Recent announcements</small></div>
    </div>
    <div className="sv-admin-push-metrics">
      <a href="/notifications" target="_blank" rel="noopener noreferrer" className="button button-outline"><Bell size={15}/> View customer opt-in page</a>
      <button type="button" className="button button-outline" disabled={busy || loading} onClick={() => void reload().catch(e => setError(e instanceof Error ? e.message : "Could not refresh."))}><RefreshCw size={15}/> Refresh</button>
    </div>
    <form onSubmit={event => { event.preventDefault(); start(); }}>
      <label>Notification title (max 64)
        <input required minLength={4} maxLength={64} value={title} disabled={busy || Boolean(pending)} onChange={event => setTitle(event.target.value)}/>
      </label>
      <label>Open website page when tapped
        <select value={path} disabled={busy || Boolean(pending)} onChange={event => setPath(event.target.value)}>
          <option value="/catalogue">Catalogue</option>
          <option value="/categories">Categories</option>
          <option value="/install">Install App</option>
          <option value="/wishlist">Favorites</option>
          <option value="/contact">Contact</option>
          <option value="/">Homepage</option>
        </select>
      </label>
      <label className="wide">Notification message (max 180)
        <textarea required minLength={8} maxLength={180} rows={3} value={message} disabled={busy || Boolean(pending)} onChange={event => setMessage(event.target.value)}/>
      </label>
      <button type="submit" className="button button-gold" disabled={busy || loading || !summary?.subscribers || Boolean(pending)}>
        <Send size={15}/> {busy ? "Sending…" : "Send announcement"}
      </button>
    </form>
    {pending && <div className="sv-push-actions">
      <button type="button" className="button button-gold" disabled={busy} onClick={() => void sendBatch(pending)}>
        <Send size={15}/> {busy ? "Sending…" : "Send next / retry batch"}
      </button>
      <button type="button" className="button button-outline" disabled={busy} onClick={() => { setPending(null); setNotice("Broadcast ended. A new announcement will be a separate campaign."); }}>Stop this broadcast</button>
    </div>}
    {error && <p className="sv-feature-notice" role="alert">{error}</p>}
    {notice && <p className="sv-feature-notice" role="status"><CheckCircle2 size={16}/>{notice}</p>}
    <p className="sv-feature-footnote">Each batch handles up to 50 opt-in browsers. For larger audiences click Send next batch until complete. A successful send means a push service accepted it, not that the person saw it. Notifications need compatible browsers, permission and connectivity. No app store or paid push provider is necessary.</p>
    <div className="sv-admin-push-history">
      <h3>Recent announcements</h3>
      {summary?.recent.length ? <ul>{summary.recent.map(item => <li key={item.id}>
        <strong>{item.title}</strong><span>{item.message}</span>
        <span>{new Date(item.createdAt).toLocaleString("en-IN")} · {item.sent} accepted · {item.failed} failed · Link: {item.path}</span>
      </li>)}</ul> : <p>No announcements sent yet.</p>}
    </div>
  </section>;
}
