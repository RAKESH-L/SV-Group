/**
 * Versioned storage for non-transactional, informational price-estimate topics.
 * The legacy enquiry table has a free-text message field. Until a database
 * migration is available, a tagged envelope keeps a submitted estimate together
 * with its optional note without changing historical records.
 *
 * Do not interpret the quantities as an order, reservation, or stock hold.
 */
export type SubmittedEstimateItem = {
  productId: string;
  name: string;
  categoryName: string;
  quantity: number;
  originalUnitPaise: number;
  indicativeUnitPaise: number;
};

const PREFIX = "SV_INFORMATION_ESTIMATE_V1:";
const MAX_ITEMS = 50;

export function encodeEnquiryMessage(message: string, items: SubmittedEstimateItem[]) {
  // Always wrap even empty selections so a visitor cannot inject a fake
  // snapshot by placing the reserved prefix in a free-text note.
  return PREFIX + JSON.stringify({ version: 1, message, items });
}

function isValidItem(item: unknown): item is SubmittedEstimateItem {
  if (!item || typeof item !== "object") return false;
  const value = item as Partial<SubmittedEstimateItem>;
  return typeof value.productId === "string" && value.productId.length > 0 && value.productId.length <= 64
    && typeof value.name === "string" && value.name.length > 0 && value.name.length <= 500
    && typeof value.categoryName === "string" && value.categoryName.length > 0 && value.categoryName.length <= 500
    && typeof value.quantity === "number" && Number.isInteger(value.quantity) && value.quantity >= 1 && value.quantity <= 99
    && typeof value.originalUnitPaise === "number" && Number.isSafeInteger(value.originalUnitPaise) && value.originalUnitPaise >= 0
    && typeof value.indicativeUnitPaise === "number" && Number.isSafeInteger(value.indicativeUnitPaise) && value.indicativeUnitPaise >= 0;
}

export function decodeEnquiryMessage(value: string | null): { message: string | null; items: SubmittedEstimateItem[] } {
  if (!value || !value.startsWith(PREFIX)) return { message: value, items: [] };
  try {
    const envelope: unknown = JSON.parse(value.slice(PREFIX.length));
    if (!envelope || typeof envelope !== "object") throw new Error("Invalid envelope.");
    const data = envelope as { version?: unknown; message?: unknown; items?: unknown };
    if (data.version !== 1 || typeof data.message !== "string" || data.message.length > 1000
      || !Array.isArray(data.items) || data.items.length > MAX_ITEMS || !data.items.every(isValidItem)) {
      throw new Error("Invalid estimate payload.");
    }
    const unique = new Set(data.items.map(item => item.productId));
    if (unique.size !== data.items.length) throw new Error("Duplicate item.");
    return { message: data.message || null, items: data.items };
  } catch {
    // Preserve malformed/legacy user text rather than inventing estimate data.
    return { message: value, items: [] };
  }
}
