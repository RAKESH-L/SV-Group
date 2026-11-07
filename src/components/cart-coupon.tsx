"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleX, Gift, TicketPercent, X } from "lucide-react";
import {
  couponIsActive, couponMinimumMet, couponSavingsPaise,
  type PublicCoupon,
} from "@/lib/coupon";
import { formatPaiseExact } from "@/lib/cart-calculations";
import { useLanguage } from "@/components/language-provider";

type Validation = { coupon?: PublicCoupon; error?: string };
type AppliedState = { coupon: PublicCoupon; code: string };
export type CouponApplication = ReturnType<typeof useCouponApplication>;

export function useCouponApplication(ready: boolean, subtotalPaise: number) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<AppliedState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tick, setTick] = useState(0);
  const initialHandled = useRef(false);
  const requestSequence = useRef(0);

  const validate = useCallback(async (nextCode: string, subtotal: number, announce = true) => {
    const sequence = ++requestSequence.current;
    const normal = nextCode.trim().toUpperCase();
    if (!normal) { setMessage("Enter a coupon code first."); setApplied(null); return; }
    if (!Number.isSafeInteger(subtotal) || subtotal <= 0) {
      setMessage("Choose at least one catalogue product before applying a code."); return;
    }
    setBusy(true); if (announce) setMessage("");
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ code: normal, subtotalPaise: subtotal }),
      });
      const result = await response.json() as Validation;
      if (sequence !== requestSequence.current) return;
      if (!response.ok || !result.coupon) throw new Error(result.error || "Coupon not available.");
      setApplied({ coupon: result.coupon, code: result.coupon.code });
      setCode(result.coupon.code);
      if (announce) setMessage(`Coupon ${result.coupon.code} applied — an extra ${result.coupon.percentOff}% off your indicative subtotal!`);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setApplied(null);
      setMessage(error instanceof Error ? error.message : "Could not verify coupon. Try again.");
    } finally { if (sequence === requestSequence.current) setBusy(false); }
  }, []);

  // A banner's "Use in calculator" link can prefill and apply a valid code.
  useEffect(() => {
    if (!ready || initialHandled.current) return;
    initialHandled.current = true;
    const fromUrl = new URLSearchParams(window.location.search).get("coupon");
    if (fromUrl) { setCode(fromUrl.toUpperCase().slice(0, 24)); void validate(fromUrl, subtotalPaise); }
  }, [ready, subtotalPaise, validate]);

  // Re-check after quantity updates and when the visitor returns to the page.
  // An admin-disabled or expired code must never continue reducing the total.
  useEffect(() => {
    if (!ready || !applied) return;
    const timer = window.setTimeout(() => void validate(applied.code, subtotalPaise, false), 400);
    return () => window.clearTimeout(timer);
  }, [ready, subtotalPaise, applied?.code, validate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const clock = window.setInterval(() => setTick(value => value + 1), 60_000);
    return () => window.clearInterval(clock);
  }, []);

  const active = applied?.coupon && couponIsActive(applied.coupon) &&
    couponMinimumMet(applied.coupon, subtotalPaise) ? applied.coupon : null;
  void tick; // rerender each minute to detect midnight expiry in IST
  const savingsPaise = active ? couponSavingsPaise(subtotalPaise, active.percentOff) : 0;
  const finalPaise = Math.max(0, subtotalPaise - savingsPaise);
  const remove = () => {
    ++requestSequence.current;
    setApplied(null); setCode(""); setBusy(false); setMessage("Coupon removed.");
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("coupon");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } catch { /* optional location cleanup */ }
  };
  return { code, setCode, applied: active, busy, message, savingsPaise, finalPaise, validate, remove };
}

export function CouponEntry({ application, subtotalPaise }: {
  application: CouponApplication;
  subtotalPaise: number;
}) {
  const { t } = useLanguage();
  const { code, setCode, applied, busy, message, savingsPaise, validate, remove } = application;
  return <section className="calculator-coupon" aria-labelledby="calculator-coupon-heading">
    <div className="calculator-coupon-heading"><TicketPercent size={19} aria-hidden="true"/>
      <div><strong id="calculator-coupon-heading">{t("Have a coupon code?")}</strong>
        <span>{t("Unlock an additional discount on your indicative total.")}</span>
      </div>
    </div>
    <form className="calculator-coupon-form" onSubmit={event => { event.preventDefault(); void validate(code, subtotalPaise); }}>
      <label htmlFor="calculator-coupon-code" className="visually-hidden">{t("Enter coupon code")}</label>
      <input id="calculator-coupon-code" type="text" inputMode="text" autoCapitalize="characters"
        autoComplete="off" spellCheck={false} placeholder="DEEPAVALI26" value={code}
        onChange={event => { setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,24)); }}
        maxLength={24} disabled={busy} aria-describedby="calculator-coupon-feedback"/>
      <button type="submit" disabled={busy || !code.trim() || subtotalPaise <= 0}>
        {busy ? t("Checking…") : <><Check size={15} aria-hidden="true"/> {t("Apply")}</>}
      </button>
      {applied && <button type="button" className="calculator-coupon-remove" onClick={remove}
        aria-label={t("Remove coupon")} title={t("Remove coupon")}><X size={17}/></button>}
    </form>
    <p id="calculator-coupon-feedback" className={applied ? "calculator-coupon-message valid" : "calculator-coupon-message"}
      role="status">{message || (applied ? t("Coupon applied successfully.") : t("Coupons are valid only during the dates set by SV Groups."))}</p>
    {applied && <div className="calculator-coupon-applied"><Gift size={18}/><div><b>{applied.code}</b>
      <small>{applied.percentOff}% {t("additional savings")}</small></div>
      <strong>−{formatPaiseExact(savingsPaise)}</strong></div>}
    <p className="calculator-coupon-note"><CircleX size={13}/>{t("Coupon savings are indicative only and do not create or confirm an order.")}</p>
  </section>;
}
