"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, Copy, Gift, Percent, Save, Ticket } from "lucide-react";
import { couponIsActive, DEFAULT_COUPON, type CouponSettings } from "@/lib/coupon";

type ApiResponse = { coupon?: CouponSettings; error?: string; saved?: boolean };

export function AdminCouponEditor() {
  const [coupon, setCoupon] = useState<CouponSettings>(DEFAULT_COUPON);
  const [published, setPublished] = useState<CouponSettings>(DEFAULT_COUPON);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const changed = JSON.stringify(coupon) !== JSON.stringify(published);
  const isActive = couponIsActive(coupon);
  const update = <K extends keyof CouponSettings>(key: K, value: CouponSettings[K]) => {
    setCoupon(previous => ({ ...previous, [key]: value }));
    setNotice(""); setError("");
  };

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const response = await fetch("/api/admin/coupon", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const body = await response.json() as ApiResponse;
      if (!response.ok || !body.coupon) throw new Error(body.error || "Could not load coupon settings.");
      setCoupon(body.coupon); setPublished(body.coupon);
    }
    void load().catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Cannot load coupon."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/admin/coupon", {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coupon),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.coupon) throw new Error(result.error || "Unable to publish this coupon.");
      setCoupon(result.coupon); setPublished(result.coupon);
      setNotice(result.coupon.enabled ? "Coupon saved. Its availability is controlled by the dates you selected." : "Coupon disabled. It will no longer appear on the public banner or validate.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save coupon."); }
    finally { setSaving(false); }
  }

  return <section className="coupon-admin" aria-labelledby="coupon-admin-heading">
    <div className="coupon-admin-heading">
      <span className="coupon-admin-icon"><Ticket size={24} aria-hidden="true"/></span>
      <div><span className="coupon-admin-eyebrow">SV GROUPS · ADMIN PROMOTIONS</span>
        <h2 id="coupon-admin-heading">Coupon Offer Manager</h2>
        <p>Configure one active promotional code for the personal Price Calculator. The compact homepage banner automatically advertises it while valid. The three rotating banners and existing website themes stay unchanged.</p>
      </div>
    </div>
    {loading && <p role="status">Loading coupon settings…</p>}
    {error && <p className="coupon-feedback error" role="alert">{error}</p>}
    {notice && <p className="coupon-feedback success" role="status">{notice}</p>}
    {!loading && <form onSubmit={publish} className="coupon-admin-form">
      <div className="coupon-admin-preview">
        <span className="coupon-preview-eyebrow"><Gift size={14}/> EXCLUSIVE CALCULATOR SAVINGS</span>
        <strong>{coupon.headline}</strong>
        <p>{coupon.description}</p>
        <div className="coupon-preview-ticket">
          <span><small>COUPON CODE</small><b>{coupon.code}</b></span>
          <span><Percent size={18}/><b>{coupon.percentOff}% EXTRA</b></span>
        </div>
        <small><CalendarDays size={13}/> Valid {coupon.startsOn} through {coupon.expiresOn} (IST) · {isActive ? "Active now" : coupon.enabled ? "Not currently valid" : "Disabled"}</small>
      </div>
      <div className="coupon-admin-fields">
        <label className="coupon-enabled"><input type="checkbox" checked={coupon.enabled} disabled={saving}
          onChange={event => update("enabled", event.target.checked)}/> Enable this coupon and banner promotion</label>
        <label>Coupon code
          <input required maxLength={24} minLength={4} pattern="[A-Z0-9]{4,24}" value={coupon.code}
            onChange={event => update("code", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))}
            autoCapitalize="characters" spellCheck={false} disabled={saving} placeholder="DEEPAVALI26"/>
        </label>
        <label>Additional discount (%)
          <input type="number" required min={1} max={50} step={1} value={coupon.percentOff}
            onChange={event => update("percentOff", Number(event.target.value))} disabled={saving}/>
        </label>
        <label>Valid from (India date)
          <input type="date" required value={coupon.startsOn} disabled={saving}
            onChange={event => update("startsOn", event.target.value)}/>
        </label>
        <label>Valid through (India date)
          <input type="date" required min={coupon.startsOn} value={coupon.expiresOn} disabled={saving}
            onChange={event => update("expiresOn", event.target.value)}/>
        </label>
        <label>Minimum indicative subtotal (₹)
          <input type="number" required min={0} max={1000000} step={1} value={coupon.minSubtotalRupees} disabled={saving}
            onChange={event => update("minSubtotalRupees", Number(event.target.value))}/>
        </label>
        <label className="wide">Banner headline
          <input required minLength={6} maxLength={70} value={coupon.headline} disabled={saving}
            onChange={event => update("headline", event.target.value)}/>
        </label>
        <label className="wide">Supporting message
          <textarea rows={3} required minLength={8} maxLength={150} value={coupon.description} disabled={saving}
            onChange={event => update("description", event.target.value)}/>
        </label>
      </div>
      <div className="coupon-admin-actions">
        <button type="submit" className="button button-gold" disabled={saving || !changed}>
          {saving ? "Saving…" : changed ? <><Save size={16}/> Publish coupon</> : <><Check size={16}/> Coupon published</>}
        </button>
        {changed && <button type="button" className="button button-outline" disabled={saving}
          onClick={() => { setCoupon(published); setError(""); setNotice(""); }}>Discard edits</button>}
        <a href="/cart" target="_blank" rel="noopener noreferrer" className="button button-outline">Open Price Calculator</a>
      </div>
      <p className="coupon-admin-note"><Copy size={14}/> Percent discount is applied <b>after</b> existing catalogue discounts, never to the original price. Validity dates include the full selected day in India (IST). Only one coupon is active at a time. These are indicative calculations, not a checkout, purchase or reservation.</p>
    </form>}
  </section>;
}
