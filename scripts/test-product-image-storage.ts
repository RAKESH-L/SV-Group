import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { normalizeProductImage } from "../src/lib/product-image";

loadEnvConfig(process.cwd());

function makeBmp24(width: number, height: number, rgba: Buffer) {
  const rowStride = Math.floor((width * 24 + 31) / 32) * 4;
  const bmp = Buffer.alloc(54 + rowStride * height);
  bmp.write("BM", 0); bmp.writeUInt32LE(bmp.length, 2); bmp.writeUInt32LE(54, 10); bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(width, 18); bmp.writeInt32LE(height, 22); bmp.writeUInt16LE(1, 26); bmp.writeUInt16LE(24, 28); bmp.writeUInt32LE(rowStride * height, 34);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = (y * width + x) * 4, target = 54 + (height - 1 - y) * rowStride + x * 3;
    bmp[target] = rgba[source + 2]; bmp[target + 1] = rgba[source + 1]; bmp[target + 2] = rgba[source];
  }
  return bmp;
}

async function main() {
  const missing = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing private environment variables: ${missing.join(", ")}`);
  if (process.env.SUPABASE_URL !== process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("The private and public Supabase URLs must target the same project.");
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  const service = createClient(projectUrl, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = createClient(projectUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const width = 24, height = 18, rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) { rgba[i * 4] = (i * 7) % 255; rgba[i * 4 + 1] = (i * 13) % 255; rgba[i * 4 + 2] = (i * 19) % 255; rgba[i * 4 + 3] = 255; }
  const image = sharp(rgba, { raw: { width, height, channels: 4 } });
  const inputs: Array<{ name: string; contentType: string; extension: string; bytes: Promise<Buffer> }> = [
    { name: "JPEG", contentType: "image/jpeg", extension: "jpg", bytes: image.clone().jpeg().toBuffer() },
    { name: "PNG", contentType: "image/png", extension: "png", bytes: image.clone().png().toBuffer() },
    { name: "WebP", contentType: "image/webp", extension: "webp", bytes: image.clone().webp().toBuffer() },
    { name: "AVIF", contentType: "image/avif", extension: "avif", bytes: image.clone().avif().toBuffer() },
    { name: "GIF", contentType: "image/gif", extension: "gif", bytes: image.clone().gif().toBuffer() },
    { name: "BMP", contentType: "image/bmp", extension: "bmp", bytes: Promise.resolve(makeBmp24(width, height, rgba)) },
    { name: "TIFF", contentType: "image/tiff", extension: "tiff", bytes: image.clone().tiff().toBuffer() },
  ];
  inputs.push({ name: "JPEG near 15 MB limit", contentType: "image/jpeg", extension: "jpg", bytes: (async () => { const jpeg = await image.clone().jpeg().toBuffer(); const padded = Buffer.alloc(15 * 1024 * 1024 - 1); jpeg.copy(padded); return padded; })() });
  const heicSample = process.env.HEIC_SAMPLE_PATH;
  if (heicSample) inputs.push({ name: "HEIC", contentType: "image/heic", extension: "heic", bytes: readFile(heicSample) });

  const cleanupPaths: string[] = [];
  try {
    for (const input of inputs) {
      const bytes = await input.bytes;
      const id = randomUUID();
      const sourcePath = `${id}.${input.extension}`;
      const { data: ticket, error: ticketError } = await service.storage.from(bucketName).createSignedUploadUrl(sourcePath, { upsert: false });
      if (ticketError || !ticket) throw new Error(`${input.name}: Supabase could not issue the signed upload ticket.`);
      cleanupPaths.push(sourcePath);
      const { error: uploadError } = await publicClient.storage.from(bucketName).uploadToSignedUrl(sourcePath, ticket.token, new Blob([new Uint8Array(bytes)], { type: input.contentType }), { contentType: input.contentType, upsert: false });
      if (uploadError) throw new Error(`${input.name}: signed upload was rejected by Supabase Storage.`);
      const { data: stored, error: readError } = await service.storage.from(bucketName).download(sourcePath);
      if (readError || !stored || stored.size !== bytes.length) throw new Error(`${input.name}: uploaded source could not be verified in Storage.`);
      const normalized = await normalizeProductImage(Buffer.from(await stored.arrayBuffer()), input.contentType);
      const finalPath = `${id}.webp`;
      const { error: saveError } = await service.storage.from(bucketName).upload(finalPath, normalized.buffer, { contentType: "image/webp", cacheControl: "0", upsert: true });
      if (saveError) throw new Error(`${input.name}: normalized WebP could not be stored.`);
      cleanupPaths.push(finalPath);
      if (sourcePath !== finalPath) {
        const { error: removeError } = await service.storage.from(bucketName).remove([sourcePath]);
        if (removeError) throw new Error(`${input.name}: temporary source image could not be removed.`);
        cleanupPaths.splice(cleanupPaths.indexOf(sourcePath), 1);
      }
      const { data: publicUrl } = service.storage.from(bucketName).getPublicUrl(finalPath);
      const response = await fetch(publicUrl.publicUrl, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("image/webp")) throw new Error(`${input.name}: public normalized image URL did not load as WebP.`);
      console.log(`PASS Supabase signed upload → normalized WebP → public read: ${input.name} (${bytes.length} source bytes)`);
    }
  } finally {
    if (cleanupPaths.length) {
      const { error } = await service.storage.from(bucketName).remove([...new Set(cleanupPaths)]);
      if (error) throw new Error("Supabase could not clean up a temporary image test object.");
    }
  }
}

main().catch((error) => {
  if (error instanceof Error && error.message.startsWith("Missing private environment variables:")) console.error(error.message);
  else console.error(error instanceof Error && /same project/.test(error.message) ? error.message : "Image Storage integration test failed; sensitive configuration was not printed.");
  process.exitCode = 1;
});
