import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { MAX_PRODUCT_IMAGE_BYTES, prepareProductImage } from "../src/lib/client-image-upload";
import { detectProductImageType } from "../src/lib/image-signature";
import { normalizeProductImage } from "../src/lib/product-image";

const width = 32, height = 24;
const rgba = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = (y * width + x) * 4;
  rgba[i] = x * 7; rgba[i + 1] = y * 9; rgba[i + 2] = (x + y) * 4; rgba[i + 3] = (x * 13 + y * 17) % 255;
}

function makeBmp24() {
  const bmp = Buffer.alloc(54 + width * 3 * height + ((4 - (width * 3) % 4) % 4) * height);
  const rowSize = Math.floor((width * 24 + 31) / 32) * 4;
  bmp.write("BM", 0); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(54, 10); bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(width, 18); bmp.writeInt32LE(height, 22); bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(24, 28); bmp.writeUInt32LE(rowSize * height, 34);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = ((y * width) + x) * 4, target = 54 + (height - 1 - y) * rowSize + x * 3;
    bmp[target] = rgba[source + 2]; bmp[target + 1] = rgba[source + 1]; bmp[target + 2] = rgba[source];
  }
  return bmp;
}

async function testFormat(name: string, contentType: string, bytes: Buffer) {
  const detected = detectProductImageType(bytes);
  assert.equal(detected?.contentType, contentType, `${name}: actual content signature should be detected`);
  const result = await normalizeProductImage(bytes, contentType);
  assert.equal((await sharp(result.buffer).metadata()).format, "webp", `${name}: normalized image should decode as WebP`);
  assert.ok(result.buffer.length <= 15 * 1024 * 1024, `${name}: normalized image must remain within the Storage limit`);
  console.log(`PASS ${name}: detected and normalized (${bytes.length} → ${result.buffer.length} bytes${result.animated ? ", animation preserved" : ""})`);
  return result;
}

async function main() {
  const image = sharp(rgba, { raw: { width, height, channels: 4 } });
  const samples: Array<[string, string, Promise<Buffer>]> = [
    ["JPEG", "image/jpeg", image.clone().jpeg({ quality: 82 }).toBuffer()],
    ["PNG", "image/png", image.clone().png().toBuffer()],
    ["WebP", "image/webp", image.clone().webp().toBuffer()],
    ["AVIF", "image/avif", image.clone().avif().toBuffer()],
    ["GIF", "image/gif", image.clone().gif().toBuffer()],
    ["TIFF", "image/tiff", image.clone().tiff().toBuffer()],
    ["BMP 24-bit", "image/bmp", Promise.resolve(makeBmp24())],
  ];
  for (const [name, contentType, pending] of samples) {
    const result = await testFormat(name, contentType, await pending);
    if (contentType === "image/png") assert.equal((await sharp(result.buffer).metadata()).hasAlpha, true, "WebP conversion should preserve PNG transparency");
  }

  const orientedJpeg = await sharp(rgba, { raw: { width, height, channels: 4 } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const orientedResult = await normalizeProductImage(orientedJpeg, "image/jpeg");
  const orientedMetadata = await sharp(orientedResult.buffer).metadata();
  assert.equal(orientedMetadata.width, height, "EXIF rotation should be applied to output width");
  assert.equal(orientedMetadata.height, width, "EXIF rotation should be applied to output height");
  console.log("PASS EXIF orientation is applied and PNG alpha is preserved");

  const animationPixels = Buffer.alloc(width * height * 2 * 4);
  for (let pixel = 0; pixel < width * height; pixel++) { animationPixels[pixel * 4] = 255; animationPixels[pixel * 4 + 3] = 255; const second = (width * height + pixel) * 4; animationPixels[second + 2] = 255; animationPixels[second + 3] = 255; }
  const animatedGif = await sharp(animationPixels, { raw: { width, height: height * 2, channels: 4, pageHeight: height } }).gif({ delay: [80, 120], loop: 0 }).toBuffer();
  const animatedResult = await testFormat("Animated GIF", "image/gif", animatedGif);
  const animatedMetadata = await sharp(animatedResult.buffer, { animated: true }).metadata();
  assert.equal(animatedResult.animated, true, "animated source should be reported as animated");
  assert.ok((animatedMetadata.pages || 1) > 1, "animated GIF should remain animated after WebP conversion");

  const heicPath = process.env.HEIC_SAMPLE_PATH;
  if (heicPath) await testFormat("HEIC sample", "image/heic", await readFile(heicPath));
  else console.log("SKIP HEIC: set HEIC_SAMPLE_PATH to a real HEIC sample to run this decoder test.");

  const mislabeled = await sharp(rgba, { raw: { width, height, channels: 4 } }).jpeg().toBuffer();
  assert.equal(detectProductImageType(mislabeled)?.contentType, "image/jpeg", "MIME and extension are not inputs to content detection");
  const browserMislabeled = await prepareProductImage(new File([mislabeled], "a-png-name.png", { type: "image/png" }));
  assert.equal(browserMislabeled.contentType, "image/jpeg", "mismatched browser MIME must use detected JPEG contents");
  assert.equal(browserMislabeled.blob.type, "image/jpeg", "signed Storage upload must use canonical content MIME");
  const wrongType = await normalizeProductImage(mislabeled, "image/jpeg");
  assert.equal((await sharp(wrongType.buffer).metadata()).format, "webp");
  assert.equal(detectProductImageType(Buffer.from("not an image")), null, "non-image bytes renamed to .jpg must be rejected");
  await assert.rejects(() => normalizeProductImage(mislabeled.subarray(0, 24), "image/jpeg"), /could not be decoded|corrupted|supported/i);

  const atLimit = Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES); const png = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer(); png.copy(atLimit);
  const nearLimitFile = await prepareProductImage(new File([atLimit], "photo.jpg", { type: "text/plain" }));
  assert.equal(nearLimitFile.blob.size, MAX_PRODUCT_IMAGE_BYTES, "a valid source at 15 MB should be accepted");
  const nearLimitResult = await normalizeProductImage(atLimit, "image/png");
  assert.ok(nearLimitResult.buffer.length <= MAX_PRODUCT_IMAGE_BYTES, "large source should optimize under the 15 MB Storage limit");
  await assert.rejects(() => prepareProductImage(new File([Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1)], "too-large.png", { type: "image/png" })), /15 MB/i);
  console.log("PASS mismatched MIME/extension, 15 MB boundary and optimization, corrupted image, and non-image rejection");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
