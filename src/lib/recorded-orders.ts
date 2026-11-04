import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Manually entered, admin-confirmed offline orders.
 * These are distinct from general information requests and price estimates.
 * No checkout, payment acceptance, or automatic order creation is performed.
 */
let setup: Promise<void> | null = null;
export async function ensureRecordedOrderTable(): Promise<void> {
  if (!setup) {
    setup = db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SiteRecordedOrders" (
        "id" UUID PRIMARY KEY,
        "reference" VARCHAR(64) NOT NULL UNIQUE,
        "amountPaise" BIGINT NOT NULL CHECK ("amountPaise" > 0),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  try { await setup; }
  catch (error) { setup = null; throw error; }
}

export const ORDER_AMOUNT_LIMIT_RUPEES = 10_000_000;

export function orderRupeesToPaise(value: string): number | null {
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) && paise > 0 && paise <= ORDER_AMOUNT_LIMIT_RUPEES * 100 ? paise : null;
}

export type RecordedOrderRow = {
  id: string;
  reference: string;
  amountPaise: bigint;
  createdAt: Date;
};

type TotalsRow = {
  count: number;
  totalPaise: bigint;
  last30Count: number;
  last30Paise: bigint;
  todayCount: number;
  todayPaise: bigint;
};

export async function getRecordedOrders() {
  await ensureRecordedOrderTable();
  const [rows, totals] = await Promise.all([
    db.$queryRaw<RecordedOrderRow[]>`
      SELECT "id", "reference", "amountPaise", "createdAt"
      FROM "SiteRecordedOrders"
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT 100
    `,
    getRecordedOrderTotals(),
  ]);
  return {
    items: rows.map(row => ({
      id: row.id,
      reference: row.reference,
      amountPaise: Number(row.amountPaise),
      createdAt: row.createdAt.toISOString(),
    })),
    totals,
  };
}

export async function getRecordedOrderTotals() {
  await ensureRecordedOrderTable();
  const rows = await db.$queryRaw<TotalsRow[]>`
    SELECT
      COUNT(*)::int AS "count",
      COALESCE(SUM("amountPaise"), 0)::bigint AS "totalPaise",
      COUNT(*) FILTER (WHERE "createdAt" >= (((now() AT TIME ZONE 'Asia/Kolkata')::date - 29)::timestamp AT TIME ZONE 'Asia/Kolkata'))::int AS "last30Count",
      COALESCE(SUM("amountPaise") FILTER (WHERE "createdAt" >= (((now() AT TIME ZONE 'Asia/Kolkata')::date - 29)::timestamp AT TIME ZONE 'Asia/Kolkata')), 0)::bigint AS "last30Paise",
      COUNT(*) FILTER (WHERE "createdAt" >= (((now() AT TIME ZONE 'Asia/Kolkata')::date)::timestamp AT TIME ZONE 'Asia/Kolkata'))::int AS "todayCount",
      COALESCE(SUM("amountPaise") FILTER (WHERE "createdAt" >= (((now() AT TIME ZONE 'Asia/Kolkata')::date)::timestamp AT TIME ZONE 'Asia/Kolkata')), 0)::bigint AS "todayPaise"
    FROM "SiteRecordedOrders"
  `;
  const row = rows[0];
  return {
    count: row?.count ?? 0,
    totalPaise: Number(row?.totalPaise ?? BigInt(0)),
    last30Count: row?.last30Count ?? 0,
    last30Paise: Number(row?.last30Paise ?? BigInt(0)),
    todayCount: row?.todayCount ?? 0,
    todayPaise: Number(row?.todayPaise ?? BigInt(0)),
  };
}

export async function createRecordedOrder(reference: string, amountPaise: number) {
  await ensureRecordedOrderTable();
  const id = randomUUID();
  await db.$executeRaw`
    INSERT INTO "SiteRecordedOrders" ("id", "reference", "amountPaise")
    VALUES (${id}::uuid, ${reference}, ${BigInt(amountPaise)})
  `;
  return id;
}

export async function deleteRecordedOrder(id: string, reference: string): Promise<boolean> {
  await ensureRecordedOrderTable();
  const affected = await db.$executeRaw`
    DELETE FROM "SiteRecordedOrders"
    WHERE "id" = ${id}::uuid AND "reference" = ${reference}
  `;
  return affected === 1;
}
