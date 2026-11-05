import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Private admin notification inbox. Incoming enquiries and email outcomes
 * already exist in their canonical tables; this module builds a small recent
 * feed without making a second copy of personal customer records.
 *
 * Only per-admin read markers are stored. Marking a notification "read" does
 * not change enquiry workflow statuses or retry an email.
 */
export type NotificationKind = "general" | "information" | "email_failed";
export type AdminNotification = {
  id: string;
  kind: NotificationKind;
  sourceId: string;
  sourceTab: "enquiries" | "information";
  reference: string | null;
  title: string;
  description: string;
  createdAt: string;
  readAt: string | null;
};
export type NotificationCounts = {
  all: number;
  unread: number;
  general: number;
  information: number;
  emailFailed: number;
  unreadFailed: number;
};
export type AdminNotificationFeed = {
  items: AdminNotification[];
  counts: NotificationCounts;
  periodDays: number;
};

const FEED_DAYS = 90;
const MAX_GENERAL = 200;
const MAX_INFORMATION = 200;
let initialized: Promise<void> | null = null;

async function ensureReadTable() {
  if (!initialized) {
    initialized = (async () => {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS "SiteAdminNotificationRead" (
          "adminId" TEXT NOT NULL REFERENCES "Admin"("id") ON DELETE CASCADE,
          "notificationKey" VARCHAR(180) NOT NULL,
          "readAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY ("adminId", "notificationKey")
        )
      `;
      // A read marker never needs to outlive its 90-day inbox window.
      await db.$executeRaw`
        DELETE FROM "SiteAdminNotificationRead"
        WHERE "readAt" < NOW() - INTERVAL '180 days'
      `;
    })();
  }
  try { await initialized; }
  catch (error) { initialized = null; throw error; }
}

function messagePreview(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 140 ? cleaned.slice(0, 137) + "…" : cleaned;
}

export async function getAdminNotificationFeed(adminId: string): Promise<AdminNotificationFeed> {
  await ensureReadTable();
  const since = new Date(Date.now() - FEED_DAYS * 86_400_000);
  const [general, information, reads] = await Promise.all([
    db.generalEnquiry.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, name: true, message: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: MAX_GENERAL,
    }),
    db.informationEnquiry.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, reference: true, name: true, productNames: true, status: true, emailStatus: true, emailErrorCode: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" }, take: MAX_INFORMATION,
    }),
    db.$queryRaw<Array<{ notificationKey: string; readAt: Date }>>`
      SELECT "notificationKey", "readAt"
      FROM "SiteAdminNotificationRead" WHERE "adminId" = ${adminId}
    `,
  ]);

  const readMap = new Map(reads.map(row => [row.notificationKey, row.readAt.toISOString()]));
  const items: AdminNotification[] = [
    ...general.map(row => {
      const id = `general:${row.id}`;
      return {
        id, kind: "general" as const, sourceId: row.id, sourceTab: "enquiries" as const,
        reference: null, title: "General enquiry received",
        description: `${row.name} · ${messagePreview(row.message)}`,
        createdAt: row.createdAt.toISOString(), readAt: readMap.get(id) ?? null,
      };
    }),
    ...information.flatMap(row => {
      const id = `information:${row.id}`;
      const info: AdminNotification = {
        id, kind: "information", sourceId: row.id, sourceTab: "information",
        reference: row.reference, title: "Product information request",
        description: `${row.reference} · ${row.name} · ${row.productNames.length ? `${row.productNames.length} product topics` : "General product enquiry"}`,
        createdAt: row.createdAt.toISOString(), readAt: readMap.get(id) ?? null,
      };
      if (row.emailStatus !== "FAILED") return [info];
      const failureId = `email_failed:${row.id}`;
      const failure: AdminNotification = {
        id: failureId, kind: "email_failed", sourceId: row.id, sourceTab: "information",
        reference: row.reference, title: "Email notification failed",
        description: `Email for ${row.reference} was not accepted. Open the information request to review or retry delivery.`,
        createdAt: row.updatedAt.toISOString(), readAt: readMap.get(failureId) ?? null,
      };
      return [failure, info];
    }),
  ];
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));

  return {
    items,
    counts: {
      all: items.length,
      unread: items.filter(item => item.readAt === null).length,
      general: items.filter(item => item.kind === "general").length,
      information: items.filter(item => item.kind === "information").length,
      emailFailed: items.filter(item => item.kind === "email_failed").length,
      unreadFailed: items.filter(item => item.kind === "email_failed" && item.readAt === null).length,
    },
    periodDays: FEED_DAYS,
  };
}

export async function markAdminNotifications(
  adminId: string, action: "read" | "unread" | "read-all", key?: string,
): Promise<void> {
  const feed = await getAdminNotificationFeed(adminId);
  if (action === "read-all") {
    if (!feed.items.length) return;
    const rows = feed.items.filter(item => item.readAt === null).map(item =>
      Prisma.sql`(${adminId}, ${item.id}, NOW())`,
    );
    if (!rows.length) return;
    await db.$executeRaw`
      INSERT INTO "SiteAdminNotificationRead" ("adminId", "notificationKey", "readAt")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("adminId", "notificationKey") DO UPDATE SET "readAt" = EXCLUDED."readAt"
    `;
    return;
  }
  if (!key || !feed.items.some(item => item.id === key)) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }
  if (action === "read") {
    await db.$executeRaw`
      INSERT INTO "SiteAdminNotificationRead" ("adminId", "notificationKey", "readAt")
      VALUES (${adminId}, ${key}, NOW())
      ON CONFLICT ("adminId", "notificationKey") DO UPDATE SET "readAt" = EXCLUDED."readAt"
    `;
  } else {
    await db.$executeRaw`
      DELETE FROM "SiteAdminNotificationRead"
      WHERE "adminId" = ${adminId} AND "notificationKey" = ${key}
    `;
  }
}
