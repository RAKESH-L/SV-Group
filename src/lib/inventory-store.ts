import { db } from "@/lib/db";
import { fromStockQuantity, type AvailabilityOption } from "@/lib/inventory-status";

let initialized: Promise<void> | null = null;

/**
 * Lightweight optional stock ledger. Separate from Prisma's Product model so
 * deployment does not require a Prisma migration or alter existing catalogue
 * queries. The DB role must be allowed to CREATE TABLE once.
 */
export async function ensureInventoryTable() {
  if (!initialized) {
    initialized = (async () => {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SiteProductInventory" (
          "productId" TEXT PRIMARY KEY REFERENCES "Product"("id") ON DELETE CASCADE,
          "quantity" INTEGER NULL CHECK ("quantity" >= 0 AND "quantity" <= 1000000),
          "lowStockThreshold" INTEGER NOT NULL DEFAULT 5 CHECK ("lowStockThreshold" >= 0 AND "lowStockThreshold" <= 1000000),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })();
  }
  try { await initialized; } catch (error) { initialized = null; throw error; }
}

type StockRow = { productId: string; quantity: number | null; lowStockThreshold: number; updatedAt: Date };
export type InventoryRow = {
  id: string; name: string; categoryId: string; categoryName: string; slug: string;
  availability: string; active: boolean; quantity: number | null; lowStockThreshold: number;
  updatedAt: string;
};

export async function listInventoryProducts(): Promise<InventoryRow[]> {
  await ensureInventoryTable();
  const [products, stock] = await Promise.all([
    db.product.findMany({
      select: {
        id: true, name: true, slug: true, categoryId: true, availability: true, active: true, updatedAt: true,
        category: { select: { name: true } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    db.$queryRaw<StockRow[]>`
      SELECT "productId", "quantity", "lowStockThreshold", "updatedAt"
      FROM "SiteProductInventory"
    `,
  ]);
  const byId = new Map(stock.map(row => [row.productId, row]));
  return products.map(p => {
    const tracked = byId.get(p.id);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      availability: p.availability,
      active: p.active,
      quantity: tracked?.quantity ?? null,
      lowStockThreshold: tracked?.lowStockThreshold ?? 5,
      updatedAt: (tracked?.updatedAt ?? p.updatedAt).toISOString(),
    };
  });
}

export async function saveInventoryProduct(input: {
  id: string;
  quantity: number | null;
  lowStockThreshold: number;
  status: AvailabilityOption;
  active: boolean;
}) {
  await ensureInventoryTable();
  const availability = fromStockQuantity(input.quantity, input.lowStockThreshold, input.status);
  const updated = await db.$transaction(async tx => {
    const found = await tx.product.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!found) return null;

    const product = await tx.product.update({
      where: { id: input.id },
      data: { availability, active: input.active },
      select: { id: true, name: true, availability: true, active: true },
    });
    await tx.$executeRaw`
      INSERT INTO "SiteProductInventory" ("productId", "quantity", "lowStockThreshold", "updatedAt")
      VALUES (${input.id}, ${input.quantity}, ${input.lowStockThreshold}, NOW())
      ON CONFLICT ("productId") DO UPDATE
        SET "quantity" = EXCLUDED."quantity",
            "lowStockThreshold" = EXCLUDED."lowStockThreshold",
            "updatedAt" = NOW()
    `;
    return product;
  });
  return updated;
}
