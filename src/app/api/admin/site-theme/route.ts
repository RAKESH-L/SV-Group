import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { getPublishedSiteTheme, getPublishedLightHeroArtwork, publishSiteTheme } from "@/lib/site-theme";

const schema = z.object({ theme: z.enum(["dark", "light"]), lightHeroArtwork: z.enum(["crackers", "diya"]).default("crackers") });

export async function GET() {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const [theme, lightHeroArtwork] = await Promise.all([getPublishedSiteTheme(), getPublishedLightHeroArtwork()]);
  return NextResponse.json({ theme, lightHeroArtwork }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } });
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
    await publishSiteTheme(parsed.data.theme, parsed.data.lightHeroArtwork);
    return NextResponse.json({ theme: parsed.data.theme, lightHeroArtwork: parsed.data.lightHeroArtwork, saved: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "The theme could not be published to the database. No setting was changed. Please check database permissions and connection." }, { status: 503 });
  }
}
