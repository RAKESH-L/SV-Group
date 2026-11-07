"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Copy, TicketPercent } from "lucide-react";
import { useState } from "react";
import { DEFAULT_COUPON, type PublicCoupon } from "@/lib/coupon";
import { useLanguage } from "@/components/language-provider";

/**
 * Match the ORIGINAL compact feature banner exactly:
 * icon | small eyebrow + coupon code + one sentence | Copy Code button,
 * with a subtle "Use in calculator" link directly under the button.
 *
 * No nested cards, discount badges, expiry strip, headings or extra CTAs.
 * The existing hero wrapper owns the card design and fireworks animation.
 */
export function CouponBanner({ coupon }: { coupon: PublicCoupon }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const { t } = useLanguage();

  async function copy() {
    setCopied(false);
    setError(false);
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
    } catch {
      setError(true);
    }
  }

  // Keep administrators' custom descriptions; simplify the original default
  // so it matches the requested one-line offer and current discount value.
  const summary = coupon.description === DEFAULT_COUPON.description
    ? `${t("Use your coupon in the Price Calculator for an additional")} ${coupon.percentOff}% ${t("off the total amount.")}`
    : coupon.description;

  return (
    <>
      <span className="hero-mini-offer-symbol hero-mini-coupon-symbol" aria-hidden="true">
        <TicketPercent size={19}/>
      </span>
      <div className="hero-mini-offer-copy hero-mini-coupon-text">
        <span className="hero-mini-offer-eyebrow">{t("EXTRA SAVINGS COUPON")}</span>
        <strong className="hero-mini-offer-title hero-mini-coupon-code-title">{coupon.code}</strong>
        <span className="hero-mini-offer-description hero-mini-coupon-supporting">{summary}</span>
      </div>
      <div className="hero-mini-coupon-compact-actions">
        <button
          type="button"
          className="hero-mini-offer-cta hero-mini-coupon-compact-copy-button"
          aria-label={t("Copy coupon code") + " " + coupon.code}
          onClick={() => void copy()}
        >
          {copied ? <Check size={15} aria-hidden="true"/> : <Copy size={15} aria-hidden="true"/>}
          <span>{t(copied ? "Copied!" : "Copy Code")}</span>
        </button>
        <Link href={`/cart?coupon=${encodeURIComponent(coupon.code)}`} className="hero-mini-coupon-compact-link">
          {t("Use in calculator")} <ArrowUpRight size={12} aria-hidden="true"/>
        </Link>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {error ? t("Copy unavailable. Select the code shown above.") : copied ? t("Coupon code copied!") : ""}
      </span>
    </>
  );
}
