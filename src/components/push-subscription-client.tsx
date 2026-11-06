"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, Info, Smartphone } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type PushStatus = "loading" | "enabled" | "disabled" | "unsupported" | "denied";
function toUint8Array(value: string) {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - b64.length % 4) % 4);
  const binary = atob(b64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function currentRegistration(): Promise<ServiceWorkerRegistration> {
  const registered = await navigator.serviceWorker.getRegistration("/");
  return registered || navigator.serviceWorker.register("/sw.js", { scope: "/" });
}
export function PushSubscriptionClient() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let live = true;
    async function refresh() {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window) || !window.isSecureContext) {
        if (live) setStatus("unsupported"); return;
      }
      if (Notification.permission === "denied") { if (live) setStatus("denied"); return; }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = registration ? await registration.pushManager.getSubscription() : null;
        if (live) setStatus(subscription ? "enabled" : "disabled");
      } catch { if (live) setStatus("unsupported"); }
    }
    void refresh();
    return () => { live = false; };
  }, []);

  async function enable() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Your browser does not support push notifications.");
      // Permission must be requested only from this explicit button click.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "disabled");
        setMessage("Notification permission wasn't granted. You can enable it in your browser settings later.");
        return;
      }
      const response = await fetch("/api/push/public-key", { cache: "no-store" });
      const body = await response.json() as { publicKey?: string; error?: string };
      if (!response.ok || !body.publicKey) throw new Error(body.error || "Notification service isn't available.");
      const registration = await currentRegistration();
      const subscription = await registration.pushManager.getSubscription() ||
        await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(body.publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("This browser did not return a valid push subscription.");
      const save = await fetch("/api/push/subscription", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ endpoint: json.endpoint, keys: {p256dh: json.keys.p256dh,auth: json.keys.auth} }),
      });
      if (!save.ok) {
        const errorBody = await save.json().catch(() => ({ error: "" })) as { error?: string };
        throw new Error(errorBody.error || "Could not register for notification announcements.");
      }
      setStatus("enabled");
      setMessage("Notifications enabled on this device. You can turn them off any time.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not enable notifications."); }
    finally { setBusy(false); }
  }

  async function disable() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) {
        const response = await fetch("/api/push/subscription", {
          method: "DELETE", headers: {"Content-Type":"application/json"}, credentials: "same-origin",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Could not remove the subscription from SV Groups. Please retry.");
        await subscription.unsubscribe();
      }
      setStatus("disabled");
      setMessage("This device has been unsubscribed from SV Groups push announcements.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not disable notifications."); }
    finally { setBusy(false); }
  }

  return <section className="sv-push-panel" aria-labelledby="sv-push-heading">
    <h2 id="sv-push-heading"><Bell size={22} style={{display:"inline",verticalAlign:"middle"}}/> {t("SV Groups Notifications")}</h2>
    <p>{t("Choose whether this browser may receive occasional SV Groups festive announcements, catalogue updates and new-feature notices. Never required to browse the catalogue.")}</p>
    <div className="sv-push-status" role="status">
      {status === "enabled" ? <CheckCircle2 size={19}/> : status === "disabled" ? <BellOff size={19}/> : <Info size={19}/>}
      {status === "enabled" ? t("Enabled on this device") :
        status === "denied" ? t("Notifications blocked by browser permissions") :
        status === "unsupported" ? t("Push notifications aren't supported in this browser") :
        status === "loading" ? t("Checking browser support…") : t("Notifications are off")}
    </div>
    <div className="sv-push-actions">
      {status === "disabled" && <button className="button button-gold" disabled={busy} onClick={() => void enable()}><Bell size={17}/> {busy ? "Enabling…" : t("Enable Notifications")}</button>}
      {status === "enabled" && <button className="button button-outline" disabled={busy} onClick={() => void disable()}><BellOff size={17}/> {busy ? "Disabling…" : t("Disable Notifications")}</button>}
    </div>
    {message && <p className="sv-feature-notice" role="status">{message}</p>}
    <div className="sv-push-details">
      <span><Smartphone size={15} style={{display:"inline",verticalAlign:"middle"}}/> iPhone/iPad: install SV Groups to your Home Screen and open the installed app to enable push on supported iOS versions. Android and desktop: use a supported browser.</span>
      <span>Notifications are opt-in. Your browser controls permission. SV Groups stores the browser's push endpoint and encryption keys until you unsubscribe or the endpoint expires, not your name or phone number. You can also turn alerts off in device settings.</span>
      <span>Push delivery depends on browser/OS support, permission, connectivity and push service availability. Installation itself does not automatically grant permission.</span>
    </div>
  </section>;
}
