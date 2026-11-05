import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { listInventoryProducts, saveInventoryProduct } from "@/lib/inventory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const editSchema = z.object({
  id: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(0).max(1000000).nullable(),
  lowStockThreshold: z.number().int().min(0).max(1000000),
  status: z.enum(["In stock", "Low stock", "Out of stock", "Coming soon"]),
  active: z.boolean(),
}).strict();

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
  });
}

export async function GET() {
  if (!(await getAdminId())) return reply({ error: "Unauthorized." }, 401);
  try {
    return reply({ products: await listInventoryProducts() });
  } catch {
    return reply({ error: "Inventory is unavailable. Check database access and permission to create the inventory table." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminId())) return reply({ error: "Unauthorized." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return reply({ error: "Invalid request origin." }, 403);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return reply({ error: "Cross-site updates are not allowed." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 1600) return reply({ error: "Request is too large." }, 413);
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ error: "Check the status, quantity, threshold and visibility fields." }, 400);
  try {
    const product = await saveInventoryProduct(parsed.data);
    if (!product) return reply({ error: "Product no longer exists. Refresh inventory." }, 404);
    return reply({ saved: true, product });
  } catch {
    return reply({ error: "Inventory could not be updated. Please try again; no changes were committed." }, 503);
  }
}
