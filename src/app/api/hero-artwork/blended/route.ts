import { NextResponse } from "next/server";
import sharp from "sharp";
import { allowedHeroUrl, getPublishedHeroImageUrl } from "@/lib/site-theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Removes ONLY the pale poster substrate from the previously approved
 * Happy Deepavali source, keeping the artwork's RGB colors unchanged.
 *
 * - Never accepts a URL supplied by the visitor (prevents SSRF).
 * - Uses the current, verified Supabase hero object.
 * - Preserves original file and both prior CSS/SVG hero choices.
 * - No brightness/saturation/contrast filters, blending or overlays.
 * - Cached by image revision so the homepage doesn't reprocess per visitor.
 *
 * If the source is already an RGBA PNG, pass through its original bytes:
 * that makes genuinely transparent future approved assets pixel-exact.
 */
const WIDTH = 1008;
// Stop before the embedded green quote strip; the website renders the
// exact quote as accessible typography instead of a printed image rectangle.
const HEIGHT = 1073;
const MAX_BYTES = 4 * 1024 * 1024;

function responseHeaders(type: string) {
  return {
    "Content-Type": type,
    "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    "X-Content-Type-Options": "nosniff",
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function removeCanvas(raw: Buffer, width: number, height: number) {
  // Composite RGB remains untouched. Only output alpha changes.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = raw[i], g = raw[i + 1], b = raw[i + 2];
      const pale = clamp01(Math.min((r - 196) / 38, (g - 164) / 40, (b - 133) / 40));
      const neutral = clamp01(1 - (r - g - 24) / 52);
      const remove = pale * clamp01((neutral - 0.1) / 0.75);

      const keyedAlpha = Math.round(255 * (1 - remove));

      // Feather only the outer 9 px to avoid a hard cut at the old frame.
      const edge = clamp01(Math.min(x / 9, (width - 1 - x) / 9, y / 9, (height - 1 - y) / 9));
      raw[i + 3] = Math.min(raw[i + 3], Math.round(keyedAlpha * edge));
    }
  }
}

export async function GET() {
  const src = await getPublishedHeroImageUrl();
  if (!src || !allowedHeroUrl(src)) {
    return NextResponse.json({ error: "Hero artwork is not available." }, {
      status: 404, headers: { "Cache-Control": "no-store" },
    });
  }
  try {
    const response = await fetch(src, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error("The published hero could not be retrieved.");
    const reported = Number(response.headers.get("content-length") || 0);
    if (reported > MAX_BYTES) throw new Error("Hero image exceeds the size limit.");

    const source = Buffer.from(await response.arrayBuffer());
    if (source.byteLength > MAX_BYTES) throw new Error("Hero image exceeds the size limit.");

    const metadata = await sharp(source, { limitInputPixels: 4_000_000, failOn: "error" }).metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height) {
      throw new Error("Invalid hero PNG.");
    }

    // If the admin has already provided a genuinely transparent asset,
    // return it byte-for-byte with no conversion.
    if (metadata.hasAlpha) {
      const stats = await sharp(source).stats();
      if (stats.channels[3] && stats.channels[3].min < 255) {
        return new NextResponse(new Uint8Array(source), { headers: responseHeaders("image/png") });
      }
    }

    if (metadata.width !== 1122 || metadata.height !== 1402) {
      // Do not modify arbitrary newly uploaded art or assume its coordinates.
      return new NextResponse(new Uint8Array(source), { headers: responseHeaders("image/png") });
    }

    // Crop away the original poster frame; the edges of the new artwork
    // now share the actual website background instead of a rectangular image.
    const { data, info } = await sharp(source, { limitInputPixels: 4_000_000 })
      .extract({ left: 57, top: 57, width: WIDTH, height: HEIGHT })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 4) throw new Error("Could not decode RGBA artwork.");
    removeCanvas(data, info.width, info.height);

    const blended = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    }).png({ compressionLevel: 8 }).toBuffer();

    return new NextResponse(new Uint8Array(blended), { headers: responseHeaders("image/png") });
  } catch (error) {
    console.error("Could not prepare blended Deepavali hero", error);
    return NextResponse.json({ error: "Hero artwork could not be prepared." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
