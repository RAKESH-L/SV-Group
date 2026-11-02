import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminId } from "@/lib/auth";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const allowedExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function storageConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  return url && key ? { client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }), bucket } : null;
}

function fileSignatureMatches(type: string, bytes: Buffer) {
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (type === "image/avif") return bytes.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(bytes.toString("ascii", 8, 12));
  return false;
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
  if (!allowedTypes.has(contentType)) return NextResponse.json({ error: "Use a JPEG, PNG, WebP or AVIF image." }, { status: 400 });
  if (!Number.isInteger(size) || size < 1 || size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Maximum image size is 15 MB." }, { status: 400 });

  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const path = `${crypto.randomUUID()}.${extension}`;
  const { data, error } = await config.client.storage.from(config.bucket).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    console.error("Could not create a signed image upload URL", error?.message);
    return NextResponse.json({ error: "Could not prepare the image upload. Check Storage configuration." }, { status: 502 });
  }
  const { data: publicData } = config.client.storage.from(config.bucket).getPublicUrl(path);
  return NextResponse.json({ path, token: data.token, bucket: config.bucket, publicUrl: publicData.publicUrl, contentType, maxBytes: MAX_IMAGE_BYTES });
}

export async function PUT(req: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await rateLimited(`upload-verify:${adminId}:${ip}`, 10, 60_000)) return NextResponse.json({ error: "Too many upload requests. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => null) as { path?: unknown; contentType?: unknown; size?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = typeof body?.size === "number" ? body.size : 0;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(path) || !allowedTypes.has(contentType) || !path.endsWith(`.${allowedExtensions[contentType]}`) || !Number.isInteger(size) || size < 1 || size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Invalid image upload details." }, { status: 400 });
  }
  const config = storageConfig();
  if (!config) return NextResponse.json({ error: "Image storage is not configured yet." }, { status: 503 });
  const { data, error } = await config.client.storage.from(config.bucket).download(path);
  if (error || !data) {
    console.error("Could not verify uploaded image", error?.message);
    return NextResponse.json({ error: "Uploaded image could not be verified." }, { status: 400 });
  }
  if (data.size !== size || data.size > MAX_IMAGE_BYTES || data.type !== contentType) {
    await config.client.storage.from(config.bucket).remove([path]);
    return NextResponse.json({ error: "Uploaded image failed size or format verification." }, { status: 400 });
  }
  const bytes = Buffer.from(await data.arrayBuffer());
  if (!fileSignatureMatches(contentType, bytes)) {
    await config.client.storage.from(config.bucket).remove([path]);
    return NextResponse.json({ error: "The uploaded file does not match its image type." }, { status: 400 });
  }
  const { data: publicData } = config.client.storage.from(config.bucket).getPublicUrl(path);
  return NextResponse.json({ url: publicData.publicUrl });
}

export async function DELETE(req: NextRequest) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { path?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(path)) return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
  const config = storageConfig();
  if (!config) return NextResponse.json({ error: "Image storage is not configured yet." }, { status: 503 });
  const { error } = await config.client.storage.from(config.bucket).remove([path]);
  if (error) {
    console.error("Could not remove unused uploaded image", error.message);
    return NextResponse.json({ error: "Could not remove the unused image." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
