import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminId } from "@/lib/auth";
import { rateLimited } from "@/lib/rate-limit";
import { detectProductImageType, productImageSource, SUPPORTED_RASTER_IMAGE_TYPES } from "@/lib/image-signature";
import { MAX_PRODUCT_IMAGE_BYTES, normalizeProductImage, ProductImageError } from "@/lib/product-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Set(SUPPORTED_RASTER_IMAGE_TYPES);
const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const imagePathPattern = new RegExp(`^${uuidPattern}\\.(jpg|png|webp|avif|gif|bmp|tiff|heic|heif)$`);

function storageConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  return url && key ? { client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }), bucket } : null;
}

async function discard(config: NonNullable<ReturnType<typeof storageConfig>>, path: string) {
  const { error } = await config.client.storage.from(config.bucket).remove([path]);
  if (error) console.error("Could not remove rejected product image", error.message);
}

export async function POST(req: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await rateLimited(`upload:${adminId}:${ip}`, 10, 60_000)) return NextResponse.json({ error: "Too many upload requests. Try again shortly." }, { status: 429 });

  const config = storageConfig();
  if (!config) return NextResponse.json({ error: "Image storage is not configured yet." }, { status: 503 });
  const body = await req.json().catch(() => null) as { contentType?: unknown; size?: unknown } | null;
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = typeof body?.size === "number" ? body.size : 0;
  const source = productImageSource(contentType);
  if (!source || !allowedTypes.has(contentType)) return NextResponse.json({ error: "This image format is not supported. Choose a valid JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF, HEIC, or HEIF image." }, { status: 400 });
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_PRODUCT_IMAGE_BYTES) return NextResponse.json({ error: "Maximum source image size is 15 MB." }, { status: 400 });

  const path = `${crypto.randomUUID()}.${source.extension}`;
  const { data, error } = await config.client.storage.from(config.bucket).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    console.error("Could not create a signed image upload URL", error?.message);
    return NextResponse.json({ error: "Could not prepare the image upload. Check Storage configuration." }, { status: 502 });
  }
  return NextResponse.json({ path, token: data.token, bucket: config.bucket, contentType, maxBytes: MAX_PRODUCT_IMAGE_BYTES });
}

export async function PUT(req: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await rateLimited(`upload-verify:${adminId}:${ip}`, 10, 60_000)) return NextResponse.json({ error: "Too many upload requests. Try again shortly." }, { status: 429 });

  const body = await req.json().catch(() => null) as { path?: unknown; contentType?: unknown; size?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  const advertisedType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = typeof body?.size === "number" ? body.size : 0;
  const source = productImageSource(advertisedType);
  if (!imagePathPattern.test(path) || !source || !allowedTypes.has(advertisedType) || !path.endsWith(`.${source.extension}`) || !Number.isSafeInteger(size) || size < 1 || size > MAX_PRODUCT_IMAGE_BYTES) {
    return NextResponse.json({ error: "Invalid image upload details." }, { status: 400 });
  }

  const config = storageConfig();
  if (!config) return NextResponse.json({ error: "Image storage is not configured yet." }, { status: 503 });
  const bucket = config.client.storage.from(config.bucket);
  const { data, error } = await bucket.download(path);
  if (error || !data) {
    console.error("Could not verify uploaded image", error?.message);
    return NextResponse.json({ error: "Uploaded image could not be read from Storage." }, { status: 400 });
  }
  if (data.size !== size || data.size > MAX_PRODUCT_IMAGE_BYTES) {
    await discard(config, path);
    return NextResponse.json({ error: "Uploaded source image failed the 15 MB size check." }, { status: 400 });
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  const detected = detectProductImageType(bytes);
  if (!detected || detected.contentType !== advertisedType) {
    await discard(config, path);
    return NextResponse.json({ error: "The uploaded file contents do not match a supported image format." }, { status: 400 });
  }

  let normalized: Awaited<ReturnType<typeof normalizeProductImage>>;
  try { normalized = await normalizeProductImage(bytes, advertisedType); }
  catch (cause) {
    await discard(config, path);
    const message = cause instanceof ProductImageError ? cause.message : "The image could not be safely decoded. Try another image or export it to JPEG or PNG.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const finalPath = `${path.slice(0, 36)}.webp`;
  const { error: uploadError } = await bucket.upload(finalPath, normalized.buffer, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (uploadError) {
    console.error("Could not save normalized product image", uploadError.message);
    await discard(config, path);
    return NextResponse.json({ error: "The optimized image could not be saved to Storage. Try a smaller image or check the bucket limit." }, { status: 502 });
  }
  if (finalPath !== path) {
    const { error: removeError } = await bucket.remove([path]);
    if (removeError) {
      console.error("Could not remove temporary source image", removeError.message);
      await discard(config, finalPath);
      return NextResponse.json({ error: "Image processing finished but Storage could not clean up its temporary source. Please retry." }, { status: 502 });
    }
  }

  const { data: publicData } = config.client.storage.from(config.bucket).getPublicUrl(finalPath);
  return NextResponse.json({ path: finalPath, url: publicData.publicUrl, contentType: "image/webp", size: normalized.buffer.length, sourceFormat: normalized.sourceFormat, animated: normalized.animated });
}

export async function DELETE(req: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await rateLimited(`upload-delete:${adminId}:${ip}`, 20, 60_000)) return NextResponse.json({ error: "Too many cleanup requests. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => null) as { path?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  if (!imagePathPattern.test(path)) return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
  const config = storageConfig();
  if (!config) return NextResponse.json({ error: "Image storage is not configured yet." }, { status: 503 });
  const { error } = await config.client.storage.from(config.bucket).remove([path]);
  if (error) {
    console.error("Could not remove unused uploaded image", error.message);
    return NextResponse.json({ error: "Could not remove the unused image." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
