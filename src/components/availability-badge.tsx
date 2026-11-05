import { T } from "@/components/language-provider";
import { availabilityKind } from "@/lib/inventory-status";

export function AvailabilityBadge({ availability, overlay = false }: { availability: string; overlay?: boolean }) {
  const kind = availabilityKind(availability);
  if (overlay && (kind === "in" || kind === "other")) return null;
  const label = kind === "in" ? "In stock"
    : kind === "low" ? "Low stock"
    : kind === "out" ? "Out of stock"
    : kind === "soon" ? "Coming soon" : availability;
  return <span className={`public-availability-badge ${kind}${overlay ? " overlay" : ""}`}>
    <T text={label}/>
  </span>;
}
