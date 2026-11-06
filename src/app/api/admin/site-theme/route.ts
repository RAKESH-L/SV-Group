import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { getPublishedSitePreferences, publishSiteTheme } from "@/lib/site-theme";

const schema = z.object({
  theme: z.enum(["dark", "light"]),
  lightHeroArtwork: z.enum(["crackers", "diya", "deepavali"]).default("crackers"),
  logo: z.enum(["ganesh", "diamond"]).optional(),
  heroImageUrl: z.string().url().max(800).nullable().optional(),
}).strict();

function allowedHeroUrl(url: string): boolean {
  try {
    const origin = process.env.SUPABASE_URL;
    if (!origin) return false;
    const source = new URL(url);
    const supabase = new URL(origin);
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
    const prefix = `/storage/v1/object/public/${bucket}/hero-artwork/`;
    const filename = source.pathname.startsWith(prefix) ? source.pathname.slice(prefix.length) : "";
    return source.protocol === "https:"
      && source.origin === supabase.origin
      && source.search === ""
      && source.hash === ""
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.png$/i.test(filename);
  } catch { return false; }
}

export async function GET() {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const settings = await getPublishedSitePreferences();
  return NextResponse.json(settings, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } });
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
    const previous = await getPublishedSitePreferences();
    const logo = parsed.data.logo ?? previous.logo;
    const heroImageUrl = parsed.data.heroImageUrl ?? previous.heroImageUrl;
    if (heroImageUrl && !allowedHeroUrl(heroImageUrl)) {
      return NextResponse.json({ error: "Use a verified image uploaded with the Approved Deepavali artwork uploader." }, { status: 400 });
    }
    if (parsed.data.lightHeroArtwork === "deepavali" && !heroImageUrl) {
      return NextResponse.json({ error: "Upload the approved Deepavali PNG before publishing this hero." }, { status: 400 });
    }
    await publishSiteTheme(parsed.data.theme, parsed.data.lightHeroArtwork, logo, heroImageUrl);
    return NextResponse.json({ theme: parsed.data.theme, lightHeroArtwork: parsed.data.lightHeroArtwork, logo, heroImageUrl, saved: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "The theme could not be published to the database. No setting was changed. Please check database permissions and connection." }, { status: 503 });
  }
}
