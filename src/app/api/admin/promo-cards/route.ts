import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { getPublishedPromoCards, promoCardsSchema, publishPromoCards } from "@/lib/site-promo-cards";

const requestSchema = z.object({ cards: promoCardsSchema }).strict();

export async function GET() {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ cards: await getPublishedPromoCards() }, {
    headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
  });
}

export async function PATCH(request: Request) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8_000) {
    return NextResponse.json({ error: "Promotional card content is too large." }, { status: 413 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: "Each card needs a short label, headline, description, button text and valid destination. Check all three cards.",
    }, { status: 400 });
  }
  try {
    await publishPromoCards(parsed.data.cards);
    return NextResponse.json({ saved: true, cards: parsed.data.cards }, {
      headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
    });
  } catch {
    return NextResponse.json({
      error: "Could not publish banner cards to the database. Your existing published banners were not changed.",
    }, { status: 503 });
  }
}
