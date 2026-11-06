import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { getAdminId } from "@/lib/auth";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A dedicated lossless PNG upload. Unlike product image uploads, this keeps
// the approved hero artwork's pixels, palette, lettering, and brightness intact.
const MAX_HERO_BYTES = 4 * 1024 * 1024;
const SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

export async function POST(request: NextRequest) {
  const adminId = await getAdminId();
  if (!adminId) return response({ error: "Unauthorized." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return response({ error: "Invalid request origin." }, 403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return response({ error: "Cross-site uploads are not allowed." }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_HERO_BYTES + 15_000) {
    return response({ error: "Choose a PNG under 4 MB." }, 413);
  }
  if (await rateLimited(`hero-upload:${adminId}`, 5, 60_000)) {
    return response({ error: "Too many uploads. Please try again shortly." }, 429);
  }

  const endpoint = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
  if (!endpoint || !key) return response({ error: "Image storage is not configured." }, 503);

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.type !== "image/png" || file.size < 64 || file.size > MAX_HERO_BYTES) {
    return response({ error: "Choose the approved Deepavali PNG file (maximum 4 MB)." }, 400);
  }

  const source = Buffer.from(await file.arrayBuffer());
  if (!source.subarray(0, 8).equals(SIGNATURE)) {
    return response({ error: "The selected file is not a genuine PNG." }, 400);
  }
  try {
    const metadata = await sharp(source, { limitInputPixels: 20_000_000, failOn: "error" }).metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height || metadata.width < 400 || metadata.height < 400) {
      return response({ error: "The hero PNG must be at least 400 × 400 pixels." }, 400);
    }
    // Fully decode to reject corrupt image bytes, but upload the original,
    // unchanged Buffer so there is zero re-encoding or colour alteration.
    await sharp(source, { limitInputPixels: 20_000_000, failOn: "error" }).raw().toBuffer();
  } catch {
    return response({ error: "The image could not be safely decoded. Please use the approved original PNG." }, 400);
  }

  const supabase = createClient(endpoint, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const filePath = `hero-artwork/${crypto.randomUUID()}.png`;
  const storage = supabase.storage.from(bucketName);
  const result = await storage.upload(filePath, source, {
    contentType: "image/png", cacheControl: "31536000", upsert: false,
  });
  if (result.error) return response({ error: "Could not save the hero to Supabase Storage. Please check the public bucket." }, 502);
  const { data } = storage.getPublicUrl(filePath);
  return response({
    url: data.publicUrl,
    width: 1122,
    originalBytes: source.length,
    message: "Original PNG safely uploaded without brightness, colour or compression changes. Publish in Appearance to display it.",
  });
}
