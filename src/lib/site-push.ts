import {
  createCipheriv, createECDH, createPrivateKey, createSign,
  generateKeyPairSync, hkdfSync, randomBytes, randomUUID,
} from "node:crypto";
import { db } from "@/lib/db";

const PUSH_BATCH_SIZE = 50;
const PUSH_TTL = 24 * 3600;
const SITE_EMAIL = "srivinayakagroups1@gmail.com";
const PUBLIC_SITE = "https://sv-groups-catalogue.vercel.app";
let tablesPromise: Promise<void> | null = null;

export type PushSubscriptionRecord = {
  endpoint: string; p256dh: string; auth: string; createdAt: Date;
};
export type PushCampaign = {
  id: string; title: string; message: string; path: string;
  createdAt: Date; sent: number; failed: number;
};

export function isAllowedPushEndpoint(value: string): boolean {
  try {
    if (value.length < 20 || value.length > 2048) return false;
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port || u.hash) return false;
    const hostname = u.hostname.toLowerCase();
    return hostname === "fcm.googleapis.com"
      || hostname === "updates.push.services.mozilla.com"
      || hostname === "web.push.apple.com"
      || hostname.endsWith(".push.apple.com")
      || hostname.endsWith(".notify.windows.com");
  } catch { return false; }
}
function validB64(value: string, length: number): boolean {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value) || value.length > 200) return false;
  try { return Buffer.from(value, "base64url").length === length; } catch { return false; }
}
export function isValidPushSubscription(data: unknown): data is {endpoint: string; keys: {p256dh: string; auth: string}} {
  if (!data || typeof data !== "object") return false;
  const sub = data as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return typeof sub.endpoint === "string" && isAllowedPushEndpoint(sub.endpoint)
    && typeof sub.keys?.p256dh === "string" && validB64(sub.keys.p256dh, 65)
    && typeof sub.keys?.auth === "string" && validB64(sub.keys.auth, 16);
}

export async function ensurePushTables() {
  if (!tablesPromise) tablesPromise = (async () => {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SiteWebPushKeys" (
        "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
        "publicKey" TEXT NOT NULL,
        "privateJwk" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SiteWebPushSubscription" (
        "endpoint" TEXT PRIMARY KEY,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SiteWebPushCampaign" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "path" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SiteWebPushDelivery" (
        "campaignId" TEXT NOT NULL REFERENCES "SiteWebPushCampaign"("id") ON DELETE CASCADE,
        "endpoint" TEXT NOT NULL,
        "status" TEXT NOT NULL CHECK ("status" IN ('SENT', 'FAILED')),
        PRIMARY KEY ("campaignId", "endpoint")
      )
    `;
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pub = publicKey.export({ format: "jwk" });
    const encoded = Buffer.concat([
      Buffer.from([4]), Buffer.from(pub.x || "", "base64url"), Buffer.from(pub.y || "", "base64url"),
    ]).toString("base64url");
    const jwk = JSON.stringify(privateKey.export({ format: "jwk" }));
    await db.$executeRaw`
      INSERT INTO "SiteWebPushKeys" ("id", "publicKey", "privateJwk")
      VALUES (1, ${encoded}, ${jwk})
      ON CONFLICT ("id") DO NOTHING
    `;
  })();
  try { await tablesPromise; } catch (error) { tablesPromise = null; throw error; }
}
type KeyRow = { publicKey: string; privateJwk: string };
async function getKeys(): Promise<KeyRow> {
  await ensurePushTables();
  const rows = await db.$queryRaw<KeyRow[]>`SELECT "publicKey", "privateJwk" FROM "SiteWebPushKeys" WHERE "id" = 1`;
  if (!rows[0]) throw new Error("Push signing keys are unavailable");
  return rows[0];
}
export async function getPublicPushKey(): Promise<string> { return (await getKeys()).publicKey; }
export async function subscribeDevice(data: { endpoint: string; keys: {p256dh: string; auth: string} }) {
  if (!isValidPushSubscription(data)) throw new Error("Invalid push subscription");
  await ensurePushTables();
  await db.$executeRaw`
    INSERT INTO "SiteWebPushSubscription" ("endpoint", "p256dh", "auth")
    VALUES (${data.endpoint}, ${data.keys.p256dh}, ${data.keys.auth})
    ON CONFLICT ("endpoint") DO UPDATE
    SET "p256dh" = EXCLUDED."p256dh", "auth" = EXCLUDED."auth"
  `;
}
export async function unsubscribeDevice(endpoint: string) {
  if (!isAllowedPushEndpoint(endpoint)) throw new Error("Invalid push endpoint");
  await ensurePushTables();
  await db.$executeRaw`DELETE FROM "SiteWebPushSubscription" WHERE "endpoint" = ${endpoint}`;
}
export async function getPushAdminSummary() {
  await ensurePushTables();
  const [counts, recent] = await Promise.all([
    db.$queryRaw<Array<{count: bigint}>>`SELECT COUNT(*)::bigint AS "count" FROM "SiteWebPushSubscription"`,
    db.$queryRaw<Array<PushCampaign>>`
      SELECT c."id", c."title", c."message", c."path", c."createdAt",
        COUNT(d."endpoint") FILTER (WHERE d."status" = 'SENT')::int AS "sent",
        COUNT(d."endpoint") FILTER (WHERE d."status" = 'FAILED')::int AS "failed"
      FROM "SiteWebPushCampaign" c
      LEFT JOIN "SiteWebPushDelivery" d ON d."campaignId" = c."id"
      GROUP BY c."id", c."title", c."message", c."path", c."createdAt"
      ORDER BY c."createdAt" DESC LIMIT 10
    `,
  ]);
  return { subscribers: Number(counts[0]?.count ?? 0), recent };
}

function b64(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}
function vapidJwt(endpoint: string, keys: KeyRow) {
  const aud = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  const payload = b64(JSON.stringify({ aud, exp: now + 11 * 3600, sub: `mailto:${SITE_EMAIL}` }));
  const data = `${header}.${payload}`;
  const jwk = JSON.parse(keys.privateJwk) as JsonWebKey;
  const privateKey = createPrivateKey({ key: jwk, format: "jwk" });
  const signature = createSign("SHA256").update(data).end().sign({
    key: privateKey, dsaEncoding: "ieee-p1363",
  });
  return `${data}.${b64(signature)}`;
}

/** RFC 8291 single-record aes128gcm Web Push encryption. Uses ephemeral
 * server ECDH per delivery and subscriber auth secret; no external SDK.
 */
function encryptPush(message: string, subscriber: PushSubscriptionRecord): Buffer {
  const clientPublic = Buffer.from(subscriber.p256dh, "base64url");
  const clientAuth = Buffer.from(subscriber.auth, "base64url");
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const serverPublic = ecdh.getPublicKey(undefined, "uncompressed");
  const shared = ecdh.computeSecret(clientPublic);
  const info = Buffer.concat([Buffer.from("WebPush: info\0"), clientPublic, serverPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, clientAuth, info, 32));
  const salt = randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const plaintext = Buffer.concat([Buffer.from(message, "utf8"), Buffer.from([2])]);
  if (plaintext.length > 3072) throw new Error("Notification too large");
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, recordSize, Buffer.from([65]), serverPublic, encrypted]);
}
async function deliver(
  recipient: PushSubscriptionRecord, payload: string, keys: KeyRow,
): Promise<"SENT" | "FAILED"> {
  if (!isAllowedPushEndpoint(recipient.endpoint)) return "FAILED";
  try {
    const body = encryptPush(payload, recipient);
    const response = await fetch(recipient.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${vapidJwt(recipient.endpoint, keys)}, k=${keys.publicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": String(PUSH_TTL),
        "Urgency": "normal",
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(7500),
      redirect: "error",
    });
    if (response.status === 404 || response.status === 410) {
      await db.$executeRaw`DELETE FROM "SiteWebPushSubscription" WHERE "endpoint" = ${recipient.endpoint}`;
    }
    return response.ok ? "SENT" : "FAILED";
  } catch { return "FAILED"; }
}
export type PushBroadcastInput = {
  campaignId: string; title: string; message: string; path: string; cursor?: string;
};
export async function broadcastPush(input: PushBroadcastInput) {
  if (!/^[0-9a-f-]{36}$/i.test(input.campaignId)) throw new Error("Invalid campaign ID");
  const keys = await getKeys();
  await db.$executeRaw`
    INSERT INTO "SiteWebPushCampaign" ("id", "title", "message", "path")
    VALUES (${input.campaignId}, ${input.title}, ${input.message}, ${input.path})
    ON CONFLICT ("id") DO NOTHING
  `;
  const existing = await db.$queryRaw<Array<{title: string; message: string; path: string}>>`
    SELECT "title", "message", "path" FROM "SiteWebPushCampaign" WHERE "id" = ${input.campaignId}
  `;
  if (existing[0]?.title !== input.title || existing[0].message !== input.message || existing[0].path !== input.path) {
    throw new Error("Campaign content changed; start a new broadcast");
  }
  const recipients = await db.$queryRaw<PushSubscriptionRecord[]>`
    SELECT "endpoint", "p256dh", "auth", "createdAt"
    FROM "SiteWebPushSubscription"
    WHERE "endpoint" > ${input.cursor || ""}
    ORDER BY "endpoint" ASC LIMIT ${PUSH_BATCH_SIZE}
  `;
  const payload = JSON.stringify({
    title: input.title, body: input.message, url: input.path,
    icon: `${PUBLIC_SITE}/api/pwa/icon/192?logo=ganesh`,
  });
  let sent = 0, failed = 0, skipped = 0;
  // Eight deliveries in parallel prevents the Hobby function from exceeding
  // limits on larger subscriber lists; an explicit next-batch control remains.
  for (let offset = 0; offset < recipients.length; offset += 8) {
    const portion = recipients.slice(offset, offset + 8);
    const outcomes = await Promise.all(portion.map(async target => {
      const prior = await db.$queryRaw<Array<{status:string}>>`
        SELECT "status" FROM "SiteWebPushDelivery"
        WHERE "campaignId" = ${input.campaignId} AND "endpoint" = ${target.endpoint}
      `;
      if (prior.length) return "SKIPPED" as const;
      const result = await deliver(target, payload, keys);
      await db.$executeRaw`
        INSERT INTO "SiteWebPushDelivery" ("campaignId", "endpoint", "status")
        VALUES (${input.campaignId}, ${target.endpoint}, ${result})
        ON CONFLICT ("campaignId", "endpoint") DO NOTHING
      `;
      return result;
    }));
    for (const value of outcomes) {
      if (value === "SENT") sent++;
      else if (value === "FAILED") failed++;
      else skipped++;
    }
  }
  return {
    sent, failed, skipped, batchSize: recipients.length,
    nextCursor: recipients.length === PUSH_BATCH_SIZE ? recipients[recipients.length - 1].endpoint : null,
  };
}
