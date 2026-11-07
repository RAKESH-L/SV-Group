import { z } from "zod";

/** One admin-managed informational calculator offer, never a checkout coupon. */
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (value: string) =>
  datePattern.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z")) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;

export const couponSettingsSchema = z.object({
  enabled: z.boolean(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,24}$/, "Use 4–24 letters/numbers."),
  percentOff: z.number().int().min(1).max(50),
  startsOn: z.string().refine(isRealDate, "Enter a real start date."),
  expiresOn: z.string().refine(isRealDate, "Enter a real end date."),
  minSubtotalRupees: z.number().int().min(0).max(1000000),
  headline: z.string().trim().min(6).max(70),
  description: z.string().trim().min(8).max(150),
}).strict().refine(value => value.expiresOn >= value.startsOn, {
  message: "Expiry date must not be earlier than the start date.",
  path: ["expiresOn"],
});
export type CouponSettings = z.infer<typeof couponSettingsSchema>;

export const DEFAULT_COUPON: CouponSettings = {
  enabled: true,
  code: "DEEPAVALI26",
  percentOff: 10,
  startsOn: "2026-11-07",
  expiresOn: "2026-11-30",
  minSubtotalRupees: 0,
  headline: "A little extra joy — 10% more savings!",
  description: "Use your coupon in the Price Calculator for an additional 10% off the indicative discounted subtotal.",
};

export function todayInIndia(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata",
  }).formatToParts(now);
  const field = (name: string) => parts.find(item => item.type === name)?.value ?? "";
  return `${field("year")}-${field("month")}-${field("day")}`;
}

export function couponIsActive(coupon: CouponSettings, now: Date = new Date()): boolean {
  const date = todayInIndia(now);
  return coupon.enabled && date >= coupon.startsOn && date <= coupon.expiresOn;
}

export function couponSavingsPaise(indicativeSubtotalPaise: number, percentOff: number): number {
  const subtotal = Number.isFinite(indicativeSubtotalPaise) ? Math.max(0, Math.round(indicativeSubtotalPaise)) : 0;
  const percent = Number.isInteger(percentOff) ? Math.max(0, Math.min(100, percentOff)) : 0;
  return Math.min(subtotal, Math.round(subtotal * percent / 100));
}

export function couponMinimumMet(coupon: CouponSettings, subtotalPaise: number): boolean {
  return subtotalPaise > 0 && subtotalPaise >= coupon.minSubtotalRupees * 100;
}

/** Publicly displayable active configuration; no customer data or secrets. */
export type PublicCoupon = CouponSettings;
