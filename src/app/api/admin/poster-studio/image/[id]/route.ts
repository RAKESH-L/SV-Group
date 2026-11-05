import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminId } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const MAX_SOURCE_BYTES = 16 * 1024 * 1024;

/**
 * Convert a catalogue picture into a small same-origin asset for the private
 * canvas editor. This prevents CORS-tainted canvas downloads and makes sure
 * the URL comes from an actual product, not an arbitrary user-supplied host.
 */
export async function GET(_request: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  if (!id || id.length > 110) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
  try {
    const product = await db.product.findUnique({ where: { id }, select: { imageUrl: true } });
    if (!product?.imageUrl) return NextResponse.json({ error: "Image unavailable." }, { status: 404 });

    const source = new URL(product.imageUrl);
    const configured = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    let configuredHostname = "";
    try { configuredHostname = new URL(configured).hostname; } catch { /* optional */ }
    const isSupabaseImage = source.hostname === configuredHostname && source.pathname.startsWith("/storage/v1/object/public/product-images/");
    const isUnsplashImage = source.hostname === "images.unsplash.com";
    if (source.protocol !== "https:" || (!isSupabaseImage && !isUnsplashImage) || source.username || source.password) {
      return NextResponse.json({ error: "This image host is not approved for poster export." }, { status: 400 });
    }

    const upstream = await fetch(source.toString(), {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) return NextResponse.json({ error: "Product image could not be loaded." }, { status: 502 });
    if (Number(upstream.headers.get("content-length") || 0) > MAX_SOURCE_BYTES) {
      return NextResponse.json({ error: "Product image is too large." }, { status: 413 });
    }
    const array = await upstream.arrayBuffer();
    if (!array.byteLength || array.byteLength > MAX_SOURCE_BYTES) return NextResponse.json({ error: "Invalid image size." }, { status: 413 });
    const buffer = await sharp(Buffer.from(array), { limitInputPixels: 45_000_000, animated: false })
      .rotate()
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 83 })
      .toBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image preview could not be generated." }, { status: 502 });
  }
}
