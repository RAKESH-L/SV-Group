import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import {
  getPublishedPromoCards,
  getPublishedCustomPromoDestinations,
  promoCardsSchema,
  customPromoDestinationsSchema,
  publishPromoCards,
  validatePromoSettings,
} from "@/lib/site-promo-cards";

const requestSchema = z.object({
  cards: promoCardsSchema,
  // Preserve custom paths for clients that opened the editor before an update.
  customDestinations: customPromoDestinationsSchema.optional(),
}).strict();

function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET() {
  if (!(await getAdminId())) return privateJson({ error: "Unauthorized." }, 401);
  const [cards, customDestinations] = await Promise.all([
    getPublishedPromoCards(),
    getPublishedCustomPromoDestinations(),
  ]);
  return privateJson({ cards, customDestinations });
}

export async function PATCH(request: Request) {
  if (!(await getAdminId())) return privateJson({ error: "Unauthorized." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return privateJson({ error: "Invalid request origin." }, 403);
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return privateJson({ error: "Cross-site updates are not allowed." }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > 16_000) {
    return privateJson({ error: "Banner settings are too large." }, 413);
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return privateJson({
      error: "Check the card texts and button links. Custom destination names need 2–48 characters, and links must be safe public site paths such as /install.",
    }, 400);
  }

  const customDestinations = parsed.data.customDestinations ?? await getPublishedCustomPromoDestinations();
  try {
    validatePromoSettings(parsed.data.cards, customDestinations);
  } catch {
    return privateJson({
      error: "A card still uses a deleted or unregistered destination. Choose another destination before publishing.",
    }, 400);
  }

  try {
    await publishPromoCards(parsed.data.cards, customDestinations);
    try { revalidateTag("sv-promo-cards", { expire: 0 }); }
    catch (error) { console.error("Could not invalidate public carousel cache", error); }
    return privateJson({
      saved: true,
      cards: parsed.data.cards,
      customDestinations,
    });
  } catch {
    return privateJson({
      error: "Could not publish banner settings. The previous published banners were preserved. Check database permissions and retry.",
    }, 503);
  }
}
