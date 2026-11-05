import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { DIAMOND_VECTOR, GANESH_VECTOR } from "@/lib/pwa-icons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedSizes = new Set([180, 192, 512]);

/**
 * Fully rasterized, opaque launcher icons work on Android, iOS and desktop.
 * The logo remains the actual approved SVG art, simply rasterized into PNG
 * on demand. The manifest includes the published logo as a query parameter,
 * so a later admin logo change results in a different icon URL.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size: rawSize } = await params;
  const size = Number(rawSize);
  if (!allowedSizes.has(size)) return new NextResponse("Icon size not supported.", { status: 404 });

  const logo = request.nextUrl.searchParams.get("logo") === "diamond" ? "diamond" : "ganesh";
  const maskable = request.nextUrl.searchParams.get("maskable") === "1";
  const source = logo === "diamond" ? DIAMOND_VECTOR : GANESH_VECTOR;
  const iconWidth = Math.round(size * (maskable ? 0.56 : logo === "ganesh" ? 0.67 : 0.72));
  const iconHeight = Math.round(size * (maskable ? 0.57 : 0.72));

  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1D5142"/><stop offset="1" stop-color="#10281F"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.20)}" fill="url(#bg)"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${Math.round(size * 0.41)}" fill="none" stroke="#C8A058" stroke-opacity=".52" stroke-width="${Math.max(2, Math.round(size * 0.008))}"/>
  </svg>`);

  try {
    const vector = source.replace("<svg ", `<svg width="${logo === "ganesh" ? 410 : 512}" height="${logo === "ganesh" ? 512 : 512}" `);
    const symbol = await sharp(Buffer.from(vector), { density: 144 })
      .resize(iconWidth, iconHeight, { fit: "contain", background: "#00000000" })
      .png()
      .toBuffer();
    const png = await sharp(background).composite([{ input: symbol, gravity: "centre" }]).png().toBuffer();
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Icon unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
