import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sanitizeSelectedItems } from "@/lib/selection-sharing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  items: z.array(z.object({id: z.string().min(1).max(100),quantity: z.number().int().min(1).max(99)}).strict()).min(1).max(50),
}).strict();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return NextResponse.json({ error: "Cross-site requests are not supported" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 6600) return NextResponse.json({ error: "Selection too large" }, { status: 413 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid saved selection" }, { status: 400 });
  const items = sanitizeSelectedItems(input.data.items);
  if (!items.length) return NextResponse.json({ error: "Nothing to restore" }, { status: 400 });
  try {
    const products = await db.product.findMany({
      where: { id: { in: items.map(i => i.id) }, active: true },
      include: { category: true },
    });
    const byId = new Map(products.map(product => [product.id, product]));
    const lines = items.flatMap(item => {
      const product = byId.get(item.id);
      if (!product) return [];
      return [{
        quantity: item.quantity,
        product: {
          id: product.id, name: product.name, slug: product.slug, description: product.description,
          imageUrl: product.imageUrl, originalPrice: Number(product.originalPrice),
          discountedPrice: Number(product.discountedPrice), availability: product.availability,
          category: { name: product.category.name, slug: product.category.slug },
        },
      }];
    });
    return NextResponse.json({ lines, unavailable: items.length - lines.length }, {
      headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" },
    });
  } catch {
    return NextResponse.json({ error: "Current catalogue could not be loaded. Try again." }, { status: 503 });
  }
}
