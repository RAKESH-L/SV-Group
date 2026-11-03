export const ADMIN_ESTIMATE_MAX_QUANTITY = 99;

export function decimalPriceToPaise(value: { toString(): string } | string) {
  const text = typeof value === "string" ? value : value.toString();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error("Invalid catalogue price.");
  const magnitude = BigInt(match[2]) * BigInt(100) + BigInt((match[3] || "").padEnd(2, "0"));
  const paise = Number(match[1] ? -magnitude : magnitude);
  if (!Number.isSafeInteger(paise)) throw new Error("Catalogue price is outside the supported range.");
  return paise;
}

export type AdminEstimateProduct = {
  productId: string;
  name: string;
  categoryName: string;
  quantity: number;
  originalUnitPaise: number;
  indicativeUnitPaise: number;
  originalLinePaise: number;
  indicativeLinePaise: number;
  savingsPaise: number;
  discountPercent: number;
};

export function calculateAdminEstimateLine(input: { productId: string; name: string; categoryName: string; quantity: number; originalUnitPaise: number; indicativeUnitPaise: number }): AdminEstimateProduct {
  const quantity = Math.max(0, Math.min(ADMIN_ESTIMATE_MAX_QUANTITY, Math.trunc(input.quantity)));
  const originalLinePaise = input.originalUnitPaise * quantity;
  const indicativeLinePaise = input.indicativeUnitPaise * quantity;
  return {
    ...input,
    quantity,
    originalLinePaise,
    indicativeLinePaise,
    savingsPaise: originalLinePaise - indicativeLinePaise,
    discountPercent: input.originalUnitPaise > 0 ? ((input.originalUnitPaise - input.indicativeUnitPaise) * 100) / input.originalUnitPaise : 0,
  };
}

export function summarizeAdminEstimate(lines: AdminEstimateProduct[]) {
  const selected = lines.filter(line => line.quantity > 0);
  const originalSubtotalPaise = selected.reduce((sum, line) => sum + line.originalLinePaise, 0);
  const indicativeSubtotalPaise = selected.reduce((sum, line) => sum + line.indicativeLinePaise, 0);
  const savingsPaise = originalSubtotalPaise - indicativeSubtotalPaise;
  return {
    distinctProducts: selected.length,
    totalQuantity: selected.reduce((sum, line) => sum + line.quantity, 0),
    originalSubtotalPaise,
    indicativeSubtotalPaise,
    savingsPaise,
    effectiveDiscountPercent: originalSubtotalPaise > 0 ? (savingsPaise * 100) / originalSubtotalPaise : 0,
  };
}
