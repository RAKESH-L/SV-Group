"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Copy, Gift, TicketPercent } from "lucide-react";
import { useState } from "react";
import type { PublicCoupon } from "@/lib/coupon";
import { useLanguage } from "@/components/language-provider";

/** Standalone ticket content. Never render the old feature banner alongside it. */
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

  const endDate = new Date(`${coupon.expiresOn}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });

  return (
    <div className="hero-mini-coupon" aria-label={t("Additional coupon offer")}>
      <div className="hero-mini-coupon-topline">
        <span className="hero-mini-coupon-kicker"><Gift size={14} aria-hidden="true"/> <span>{t("EXTRA SAVINGS COUPON")}</span></span>
        <span className="hero-mini-coupon-percent"><TicketPercent size={16} aria-hidden="true"/> {coupon.percentOff}% {t("EXTRA OFF")}</span>
      </div>
      <div className="hero-mini-coupon-content">
        <strong>{coupon.headline}</strong>
        <p>{coupon.description}</p>
      </div>
      <div className="hero-mini-coupon-bottom">
        <div className="hero-mini-coupon-code">
          <span>{t("YOUR COUPON CODE")}</span>
          <b>{coupon.code}</b>
        </div>
        <div className="hero-mini-coupon-actions">
          <button type="button" className="hero-mini-coupon-copy" onClick={() => void copy()}
            aria-label={t("Copy coupon code") + " " + coupon.code}>
            {copied ? <Check size={16} aria-hidden="true"/> : <Copy size={16} aria-hidden="true"/>}
            <span>{t(copied ? "Copied!" : "Copy Code")}</span>
          </button>
          <Link href={`/cart?coupon=${encodeURIComponent(coupon.code)}`} className="hero-mini-coupon-use">
            {t("Use in calculator")} <ArrowUpRight size={14} aria-hidden="true"/>
          </Link>
        </div>
      </div>
      <span className="hero-mini-coupon-validity">
        {t("Valid through")} {endDate} · {t("Additional savings on indicative catalogue prices")}
      </span>
      <span className="hero-mini-coupon-feedback" role="status" aria-live="polite">
        {error ? t("Copy unavailable. Select the code shown above.") : copied ? t("Coupon code copied!") : ""}
      </span>
    </div>
  );
}
