import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { posterConfigSchema } from "@/lib/poster-studio";
import { deletePosterDraft, listPosterDrafts, savePosterDraft } from "@/lib/poster-studio-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(70),
  config: posterConfigSchema,
}).strict();

const deleteSchema = z.object({ id: z.string().uuid() }).strict();

function unsafeOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin !== new URL(request.url).origin);
}

function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
  });
}

export async function GET() {
  if (!(await getAdminId())) return response({ error: "Unauthorized." }, 401);
  try {
    return response({ drafts: await listPosterDrafts() });
  } catch {
    return response({ error: "Could not load saved posters. Check the database connection." }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await getAdminId())) return response({ error: "Unauthorized." }, 401);
  if (unsafeOrigin(request)) return response({ error: "Invalid request origin." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 9000) return response({ error: "Poster data is too large." }, 413);
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "Check your poster title and text length before saving." }, 400);
  try {
    const id = await savePosterDraft(parsed.data);
    return response({ saved: true, id, drafts: await listPosterDrafts() });
  } catch (error) {
    if (error instanceof Error && error.message === "LIMIT_REACHED") return response({ error: "You can save up to 60 posters. Remove an old draft first." }, 409);
    return response({ error: "Could not save this poster. Your current edits remain on screen." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!(await getAdminId())) return response({ error: "Unauthorized." }, 401);
  if (unsafeOrigin(request)) return response({ error: "Invalid request origin." }, 403);
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "Invalid poster ID." }, 400);
  try {
    const deleted = await deletePosterDraft(parsed.data.id);
    return response({ deleted, drafts: await listPosterDrafts() }, deleted ? 200 : 404);
  } catch {
    return response({ error: "Could not delete this saved poster." }, 503);
  }
}
