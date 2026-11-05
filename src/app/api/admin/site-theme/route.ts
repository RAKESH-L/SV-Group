import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { getPublishedSiteTheme, getPublishedLightHeroArtwork, getPublishedSiteLogo, publishSiteTheme } from "@/lib/site-theme";

const schema = z.object({ theme: z.enum(["dark", "light"]), lightHeroArtwork: z.enum(["crackers", "diya"]).default("crackers"), logo: z.enum(["ganesh", "diamond"]).optional() });

export async function GET() {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const [theme, lightHeroArtwork, logo] = await Promise.all([getPublishedSiteTheme(), getPublishedLightHeroArtwork(), getPublishedSiteLogo()]);
  return NextResponse.json({ theme, lightHeroArtwork, logo }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } });
}

export async function PATCH(request: Request) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid theme and light-theme hero illustration." }, { status: 400 });
  try {
    const logo = parsed.data.logo ?? await getPublishedSiteLogo();
    await publishSiteTheme(parsed.data.theme, parsed.data.lightHeroArtwork, logo);
    return NextResponse.json({ theme: parsed.data.theme, lightHeroArtwork: parsed.data.lightHeroArtwork, logo, saved: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "The theme could not be published to the database. No setting was changed. Please check database permissions and connection." }, { status: 503 });
  }
}
