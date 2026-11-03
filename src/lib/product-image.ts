import sharp, { type Metadata } from "sharp";
import heicConvert from "heic-convert";
import { detectProductImageType, productImageSource } from "@/lib/image-signature";

export const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 60_000_000;
const MAX_ANIMATION_FRAMES = 200;
const MAX_ANIMATION_PIXELS = 100_000_000;

type DecodedBitmap = { data: Buffer; width: number; height: number };

function decodeBitmap(input: Buffer): DecodedBitmap {
  if (input.length < 54 || input.toString("ascii", 0, 2) !== "BM") throw new ProductImageError("This BMP file is incomplete or malformed.");
  const pixelOffset = input.readUInt32LE(10);
  const headerSize = input.readUInt32LE(14);
  if (headerSize < 40 || headerSize > input.length) throw new ProductImageError("This BMP header is not supported. Export the image as PNG or JPEG.");
  const width = input.readInt32LE(18);
  const signedHeight = input.readInt32LE(22);
  const planes = input.readUInt16LE(26);
  const bitsPerPixel = input.readUInt16LE(28);
  const compression = input.readUInt32LE(30);
  const colorsUsed = input.readUInt32LE(46);
  const height = Math.abs(signedHeight);
  if (width < 1 || height < 1 || width * height > MAX_INPUT_PIXELS || planes !== 1) throw new ProductImageError("This BMP has invalid or excessively large dimensions.");
  const rle8 = bitsPerPixel === 8 && compression === 1;
  const rle4 = bitsPerPixel === 4 && compression === 2;
  const rle = rle8 || rle4;
  if (![1, 4, 8, 16, 24, 32].includes(bitsPerPixel) || ![0, 1, 2, 3].includes(compression) || (compression === 3 && bitsPerPixel < 16) || ([1, 2].includes(compression) && !rle) || (rle && signedHeight < 0)) {
    throw new ProductImageError("This BMP uses a compression or color mode that is not supported. Save it as an uncompressed BMP or PNG.");
  }
  const rowStride = Math.floor((width * bitsPerPixel + 31) / 32) * 4;
  if (pixelOffset > input.length || (!rle && pixelOffset + rowStride * height > input.length)) throw new ProductImageError("This BMP pixel data is incomplete or corrupted.");

  let redMask = 0x7c00, greenMask = 0x03e0, blueMask = 0x001f, alphaMask = 0;
  if (bitsPerPixel === 32) { redMask = 0x00ff0000; greenMask = 0x0000ff00; blueMask = 0x000000ff; }
  if (compression === 3) {
    const masksAt = headerSize >= 52 ? 54 : 14 + headerSize;
    if (masksAt + 12 > input.length) throw new ProductImageError("This BMP has incomplete color-channel information.");
    redMask = input.readUInt32LE(masksAt); greenMask = input.readUInt32LE(masksAt + 4); blueMask = input.readUInt32LE(masksAt + 8);
    if (headerSize >= 56 && masksAt + 16 <= input.length) alphaMask = input.readUInt32LE(masksAt + 12);
  }
  const channel = (pixel: number, mask: number) => {
    if (!mask) return 255;
    const shift = Math.clz32(mask) ^ 31;
    const value = (pixel & mask) >>> shift;
    const maximum = mask >>> shift;
    return Math.round((value / maximum) * 255);
  };

  let palette: Buffer | null = null;
  if (bitsPerPixel <= 8) {
    const count = colorsUsed || (1 << bitsPerPixel);
    const paletteStart = 14 + headerSize;
    if (count > 256 || paletteStart + count * 4 > pixelOffset) throw new ProductImageError("This BMP color table is malformed.");
    palette = input.subarray(paletteStart, paletteStart + count * 4);
  }
  const output = Buffer.allocUnsafe(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) output[pixel * 4 + 3] = 255;
  const writePaletteIndex = (x: number, y: number, index: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height || !palette || index * 4 + 3 >= palette.length) throw new ProductImageError("This BMP references invalid pixel or color-table data.");
    const source = index * 4, target = ((height - 1 - y) * width + x) * 4;
    output[target] = palette[source + 2]; output[target + 1] = palette[source + 1]; output[target + 2] = palette[source];
  };
  if (rle) {
    let cursor = pixelOffset, x = 0, y = 0, ended = false;
    while (cursor + 1 < input.length && !ended) {
      const count = input[cursor++], value = input[cursor++];
      if (count > 0) {
        for (let index = 0; index < count; index++) writePaletteIndex(x++, y, rle8 ? value : (index % 2 === 0 ? value >>> 4 : value & 0x0f));
        continue;
      }
      if (value === 0) { x = 0; y++; continue; }
      if (value === 1) { ended = true; continue; }
      if (value === 2) {
        if (cursor + 1 >= input.length) throw new ProductImageError("This BMP has an incomplete RLE movement command.");
        x += input[cursor++]; y += input[cursor++];
        if (x > width || y >= height) throw new ProductImageError("This BMP RLE movement exceeds its image dimensions.");
        continue;
      }
      const absolutePixels = value;
      const byteCount = rle8 ? absolutePixels : Math.ceil(absolutePixels / 2);
      if (cursor + byteCount > input.length) throw new ProductImageError("This BMP has incomplete RLE pixel data.");
      for (let index = 0; index < absolutePixels; index++) {
        const byte = input[cursor + (rle8 ? index : Math.floor(index / 2))];
        writePaletteIndex(x++, y, rle8 ? byte : (index % 2 === 0 ? byte >>> 4 : byte & 0x0f));
      }
      cursor += byteCount;
      if (byteCount % 2 === 1) cursor++;
    }
    if (!ended) throw new ProductImageError("This BMP RLE pixel stream is incomplete.");
    return { data: output, width, height };
  }
  let hasAlpha = bitsPerPixel === 32 && alphaMask !== 0;
  if (bitsPerPixel === 32 && compression === 0) {
    hasAlpha = false;
    for (let y = 0; y < height && !hasAlpha; y++) for (let x = 0; x < width; x++) if (input[pixelOffset + y * rowStride + x * 4 + 3] !== 0) { hasAlpha = true; break; }
  }
  for (let y = 0; y < height; y++) {
    const sourceY = signedHeight < 0 ? y : height - y - 1;
    const row = pixelOffset + sourceY * rowStride;
    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4;
      if (bitsPerPixel <= 8) {
        const value = input[row + Math.floor((x * bitsPerPixel) / 8)];
        const index = bitsPerPixel === 8 ? value : bitsPerPixel === 4 ? (x % 2 === 0 ? value >>> 4 : value & 0x0f) : (value >>> (7 - (x % 8))) & 0x01;
        writePaletteIndex(x, y, index);
      } else if (bitsPerPixel === 24) {
        const source = row + x * 3; output[target] = input[source + 2]; output[target + 1] = input[source + 1]; output[target + 2] = input[source]; output[target + 3] = 255;
      } else {
        const pixel = bitsPerPixel === 16 ? input.readUInt16LE(row + x * 2) : input.readUInt32LE(row + x * 4);
        output[target] = channel(pixel, redMask); output[target + 1] = channel(pixel, greenMask); output[target + 2] = channel(pixel, blueMask); output[target + 3] = hasAlpha ? channel(pixel, alphaMask) : 255;
      }
    }
  }
  return { data: output, width, height };
}

export class ProductImageError extends Error {}

export async function normalizeProductImage(input: Buffer, advertisedType: string) {
  const detected = detectProductImageType(input);
  const expected = productImageSource(advertisedType);
  if (!detected || !expected || detected.contentType !== advertisedType) {
    throw new ProductImageError("The uploaded file contents do not match a supported image format.");
  }
  if (advertisedType === "image/svg+xml") {
    throw new ProductImageError("SVG files must be safely rasterized in the browser before upload.");
  }

  let metadata: Metadata;
  let bitmap: DecodedBitmap | null = null;
  try {
    if (advertisedType === "image/bmp") {
      bitmap = decodeBitmap(input);
      metadata = { width: bitmap.width, height: bitmap.height, pages: 1 } as Metadata;
    } else {
      metadata = await sharp(input, { animated: true, failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    }
  } catch (cause) {
    if (cause instanceof ProductImageError) throw cause;
    throw new ProductImageError("The image could not be decoded. It may be corrupted, encrypted, or unsupported by the available image decoder.");
  }

  const matchesDecoder = advertisedType === "image/bmp" ? bitmap !== null : expected.sharpFormats.includes(metadata.format || "");
  if (!matchesDecoder) {
    throw new ProductImageError("The image contents do not match the detected format. Select a valid image and try again.");
  }
  if (!metadata.width || !metadata.height || metadata.width < 1 || metadata.height < 1) {
    throw new ProductImageError("The image does not contain usable dimensions.");
  }
  const pages = metadata.pages || 1;
  const pageHeight = metadata.pageHeight || metadata.height;
  if (pages > MAX_ANIMATION_FRAMES || metadata.width * pageHeight * pages > MAX_ANIMATION_PIXELS) {
    throw new ProductImageError("This animation has too many frames to process safely. Reduce its duration or upload a still image.");
  }

  let decodeInput = input;
  if (advertisedType === "image/heic" || advertisedType === "image/heif") {
    try {
      decodeInput = Buffer.from(await heicConvert({ buffer: input, format: "JPEG", quality: 0.94 }));
    } catch {
      throw new ProductImageError("This HEIC/HEIF image could not be decoded. It may be corrupted, encrypted, or use an unsupported codec.");
    }
  }

  for (const [dimension, quality] of [[4096, 86], [4096, 80], [3072, 78], [2560, 74], [2048, 70]] as const) {
    let converted: Buffer;
    try {
      const image = bitmap
        ? sharp(bitmap.data, { raw: { width: bitmap.width, height: bitmap.height, channels: 4 } })
        : sharp(decodeInput, { animated: advertisedType === "image/gif", failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS });
      converted = await image
        .rotate()
        .resize({ width: dimension, height: dimension, fit: "inside", withoutEnlargement: true })
        .webp({ quality, effort: 4, smartSubsample: true })
        .toBuffer();
    } catch {
      throw new ProductImageError("The image could not be optimized. It may be corrupted or unsupported by the available image decoder.");
    }
    if (converted.length > 0 && converted.length <= MAX_PRODUCT_IMAGE_BYTES) {
      const outputMetadata = await sharp(converted, { animated: true, failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS }).metadata();
      if (outputMetadata.format !== "webp") throw new ProductImageError("Image optimization did not produce a valid WebP image.");
      return { buffer: converted, animated: advertisedType === "image/gif" && pages > 1, sourceFormat: bitmap ? "bmp" : advertisedType.replace("image/", ""), width: outputMetadata.width, height: outputMetadata.height };
    }
  }
  throw new ProductImageError("The optimized image still exceeds the 15 MB Storage limit. Choose a smaller or less detailed image.");
}
