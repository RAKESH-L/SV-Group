import { db } from "@/lib/db";
import { posterConfigSchema, type PosterConfig, type PosterDraft } from "@/lib/poster-studio";

type Row = {
  id: string;
  name: string;
  config: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

async function ensurePosterDraftTable() {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SitePosterDraft" (
      "id" TEXT PRIMARY KEY,
      "name" VARCHAR(70) NOT NULL,
      "config" JSONB NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function recordFromRow(row: Row): PosterDraft | null {
  const parsed = posterConfigSchema.safeParse(row.config);
  if (!parsed.success) return null;
  return {
    id: row.id,
    name: row.name,
    config: parsed.data,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function listPosterDrafts(): Promise<PosterDraft[]> {
  await ensurePosterDraftTable();
  const rows = await db.$queryRaw<Row[]>`
    SELECT "id", "name", "config", "createdAt", "updatedAt"
    FROM "SitePosterDraft"
    ORDER BY "updatedAt" DESC
    LIMIT 60
  `;
  return rows.map(recordFromRow).filter((row): row is PosterDraft => row !== null);
}

export async function savePosterDraft(input: { id?: string; name: string; config: PosterConfig }): Promise<string> {
  await ensurePosterDraftTable();
  const id = input.id || crypto.randomUUID();
  if (!input.id) {
    const rows = await db.$queryRaw<Array<{ total: bigint }>>`SELECT count(*) AS total FROM "SitePosterDraft"`;
    if (Number(rows[0]?.total || 0) >= 60) throw new Error("LIMIT_REACHED");
  }
  await db.$executeRaw`
    INSERT INTO "SitePosterDraft" ("id", "name", "config", "updatedAt")
    VALUES (${id}, ${input.name}, ${JSON.stringify(input.config)}::jsonb, NOW())
    ON CONFLICT ("id") DO UPDATE
      SET "name" = EXCLUDED."name", "config" = EXCLUDED."config", "updatedAt" = NOW()
  `;
  return id;
}

export async function deletePosterDraft(id: string): Promise<boolean> {
  await ensurePosterDraftTable();
  const result = await db.$executeRaw`DELETE FROM "SitePosterDraft" WHERE "id" = ${id}`;
  return result === 1;
}
