import type { ProductView } from "@/components/product-card";

export type CartLine = { product: ProductView; quantity: number };
export const MAX_CALCULATOR_QUANTITY = 99;

export function toPaise(value: number) {
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function formatPaise(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: amount % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(amount / 100);
}

export function calculateCartTotals(lines: CartLine[]) {
  return lines.reduce((totals, line) => {
    const quantity = Math.max(0, Math.min(MAX_CALCULATOR_QUANTITY, Math.trunc(line.quantity)));
    return {
      originalPaise: totals.originalPaise + toPaise(line.product.originalPrice) * quantity,
      indicativePaise: totals.indicativePaise + toPaise(line.product.discountedPrice) * quantity,
      totalQuantity: totals.totalQuantity + quantity,
    };
  }, { originalPaise: 0, indicativePaise: 0, totalQuantity: 0 });
}

export function calculateLineAmounts(line: CartLine) {
  const quantity = Math.max(0, Math.min(MAX_CALCULATOR_QUANTITY, Math.trunc(line.quantity)));
  const originalUnitPaise = toPaise(line.product.originalPrice);
  const indicativeUnitPaise = toPaise(line.product.discountedPrice);
  const originalLinePaise = originalUnitPaise * quantity;
  const indicativeLinePaise = indicativeUnitPaise * quantity;
  const savingsPaise = originalLinePaise - indicativeLinePaise;
  return {
    quantity,
    originalUnitPaise,
    indicativeUnitPaise,
    originalLinePaise,
    indicativeLinePaise,
    savingsPaise,
    discountPercent: originalUnitPaise > 0 ? (savingsPaise / originalLinePaise) * 100 : 0,
  };
}

export function calculateEffectiveDiscountPercent(originalPaise: number, savingsPaise: number) {
  return originalPaise > 0 ? (savingsPaise / originalPaise) * 100 : 0;
}

export function formatPaiseExact(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100);
}

export function isSelectableAvailability(value: string) {
  return !/(?:out\s+of\s+stock|unavailable|sold\s+out|not\s+available|not\s+in\s+stock|discontinued|coming\s+soon|stock\s*:\s*0)/i.test(value.trim());
}
