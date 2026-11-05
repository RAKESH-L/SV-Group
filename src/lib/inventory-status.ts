/**
 * Customer-facing availability labels. Numeric inventory is optional and
 * maintained manually in Admin → Inventory; no online purchase/reservation
 * automatically deducts stock.
 */
export const AVAILABILITY_OPTIONS = ["In stock", "Low stock", "Out of stock", "Coming soon"] as const;
export type AvailabilityOption = (typeof AVAILABILITY_OPTIONS)[number];
export type AvailabilityKind = "in" | "low" | "out" | "soon" | "other";

export function availabilityKind(value: string): AvailabilityKind {
  const text = value.trim().toLowerCase();
  if (/(?:out\s*of\s*stock|sold\s*out|unavailable|not\s*available|not\s*in\s*stock|discontinued|stock\s*:\s*0)/i.test(text)) return "out";
  if (/(?:coming\s*soon|arriving\s*soon|upcoming)/i.test(text)) return "soon";
  if (/(?:low\s*stock|limited\s*stock|few\s*left|running\s*low)/i.test(text)) return "low";
  if (/(?:in\s*stock|available|ready|stocked)/i.test(text)) return "in";
  return "other";
}

export function availabilityOption(value: string): AvailabilityOption {
  const kind = availabilityKind(value);
  if (kind === "out") return "Out of stock";
  if (kind === "soon") return "Coming soon";
  if (kind === "low") return "Low stock";
  return "In stock";
}

export function fromStockQuantity(quantity: number | null, threshold: number, manualStatus: AvailabilityOption): AvailabilityOption {
  if (quantity === null) return manualStatus;
  if (quantity === 0) return "Out of stock";
  return quantity <= threshold ? "Low stock" : "In stock";
}
