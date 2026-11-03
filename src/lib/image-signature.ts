export type ProductImageSource = {
  contentType: string;
  extension: string;
  sharpFormats: readonly string[];
};

const SOURCES: Record<string, ProductImageSource> = {
  "image/jpeg": { contentType: "image/jpeg", extension: "jpg", sharpFormats: ["jpeg", "jpg"] },
  "image/png": { contentType: "image/png", extension: "png", sharpFormats: ["png"] },
  "image/webp": { contentType: "image/webp", extension: "webp", sharpFormats: ["webp"] },
  "image/avif": { contentType: "image/avif", extension: "avif", sharpFormats: ["heif", "avif"] },
  "image/gif": { contentType: "image/gif", extension: "gif", sharpFormats: ["gif"] },
  "image/bmp": { contentType: "image/bmp", extension: "bmp", sharpFormats: ["bmp-decoder"] },
  "image/tiff": { contentType: "image/tiff", extension: "tiff", sharpFormats: ["tiff"] },
  "image/heic": { contentType: "image/heic", extension: "heic", sharpFormats: ["heif"] },
  "image/heif": { contentType: "image/heif", extension: "heif", sharpFormats: ["heif"] },
  "image/svg+xml": { contentType: "image/svg+xml", extension: "svg", sharpFormats: ["svg"] },
};

export const SUPPORTED_RASTER_IMAGE_TYPES = Object.keys(SOURCES).filter((type) => type !== "image/svg+xml");

export function productImageSource(contentType: string) {
  return SOURCES[contentType] ?? null;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function isSvg(bytes: Uint8Array) {
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  const text = new TextDecoder().decode(bytes.subarray(start, Math.min(bytes.length, start + 4096))).trimStart();
  if (!text.startsWith("<")) return false;
  return /^(?:<\?xml\b[^?]*\?>\s*)?(?:<!doctype\s+svg\b[^>]*>\s*)?<svg(?:\s|>)/i.test(text);
}

export function detectProductImageType(bytes: Uint8Array): ProductImageSource | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return SOURCES["image/jpeg"];
  if (bytes.length >= 8 && bytes[0] === 137 && ascii(bytes, 1, 7) === "PNG\r\n\u001a\n") return SOURCES["image/png"];
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return SOURCES["image/webp"];
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) return SOURCES["image/gif"];
  if (bytes.length >= 2 && ascii(bytes, 0, 2) === "BM") return SOURCES["image/bmp"];
  if (bytes.length >= 4 && ((ascii(bytes, 0, 4) === "II*\u0000") || (ascii(bytes, 0, 4) === "MM\u0000*" ) || (ascii(bytes, 0, 4) === "II+\u0000") || (ascii(bytes, 0, 4) === "MM\u0000+"))) return SOURCES["image/tiff"];
  if (bytes.length >= 16 && ascii(bytes, 4, 4) === "ftyp") {
    const brands = new Set<string>();
    for (let offset = 8; offset + 4 <= Math.min(bytes.length, 128); offset += 4) brands.add(ascii(bytes, offset, 4));
    if (brands.has("avif") || brands.has("avis")) return SOURCES["image/avif"];
    if (["heic", "heix", "hevc", "hevx"].some((brand) => brands.has(brand))) return SOURCES["image/heic"];
    if (["heif", "mif1", "msf1"].some((brand) => brands.has(brand))) return SOURCES["image/heif"];
  }
  if (isSvg(bytes)) return SOURCES["image/svg+xml"];
  return null;
}
