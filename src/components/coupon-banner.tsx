"use client";

import Link from "next/link";
import { Check, Copy, TicketPercent } from "lucide-react";
import { useState } from "react";
import type { PublicCoupon } from "@/lib/coupon";
import { useLanguage } from "@/components/language-provider";

export function CouponBanner({ coupon }: { coupon: PublicCoupon }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const { t } = useLanguage();
  async function copy() {
    setError(false);
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
    } catch {
      setError(true);
    }
  }
  return <div className="hero-mini-coupon" aria-label={t("Additional coupon offer")}>
    <div className="hero-mini-coupon-content">
      <span className="hero-mini-coupon-kicker"><TicketPercent size={14}/> {t("EXTRA SAVINGS COUPON")}</span>
      <strong>{coupon.headline}</strong>
      <small>{t("Use code")} <b>{coupon.code}</b> · {coupon.percentOff}% {t("additional discount")} · {t("Valid through")} {coupon.expiresOn}</small>
    </div>
    <div className="hero-mini-coupon-actions">
      <button type="button" className="hero-mini-coupon-copy" onClick={() => void copy()}
        aria-label={t("Copy coupon code") + " " + coupon.code}>
        {copied ? <Check size={14}/> : <Copy size={14}/>}
        {t(copied ? "Copied!" : "Copy Code")}
      </button>
      <Link href={`/cart?coupon=${encodeURIComponent(coupon.code)}`} className="hero-mini-coupon-use">
        {t("Use in calculator")} <span aria-hidden="true">↗</span>
      </Link>
    </div>
    {error && <span className="hero-mini-coupon-copy-error" role="status">{t("Copy unavailable. Select the code shown above.")}</span>}
  </div>;
}
