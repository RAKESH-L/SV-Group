import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminId } from "@/lib/auth";
import { createRecordedOrder, deleteRecordedOrder, getRecordedOrders, orderRupeesToPaise } from "@/lib/recorded-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  reference: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9 _#.-]+$/, "Use letters, numbers, spaces or - # . in the reference."),
  amountRupees: z.string().trim().max(20),
}).strict();
const deleteSchema = z.object({
  id: z.string().uuid(),
  reference: z.string().min(2).max(64),
}).strict();

function requestFromSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } });
}

export async function GET() {
  if (!(await getAdminId())) return privateJson({ error: "Unauthorized." }, 401);
  try {
    return privateJson(await getRecordedOrders());
  } catch {
    return privateJson({ error: "Could not load confirmed order records. Check database permissions." }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await getAdminId())) return privateJson({ error: "Unauthorized." }, 401);
  if (!requestFromSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 1500) return privateJson({ error: "Request too large." }, 413);
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return privateJson({ error: parsed.error.issues[0]?.message || "Enter an order reference and amount." }, 400);
  const amountPaise = orderRupeesToPaise(parsed.data.amountRupees);
  if (amountPaise === null) return privateJson({ error: "Enter a positive order amount in rupees, up to ₹1,00,00,000, with at most two decimal places." }, 400);
  try {
    const id = await createRecordedOrder(parsed.data.reference, amountPaise);
    return privateJson({ created: true, id }, 201);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error.code === "23505" || error.code === "P2010")) {
      // Prisma may wrap PostgreSQL unique violations in P2010 rather than expose 23505.
      // Verify before presenting the specific duplicate-reference message.
      if ("code" in error && error.code === "23505") return privateJson({ error: "That order reference already exists. Choose a unique reference." }, 409);
    }
    return privateJson({ error: "Could not save this confirmed order. The reference must be unique; check database access and try again." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!(await getAdminId())) return privateJson({ error: "Unauthorized." }, 401);
  if (!requestFromSameOrigin(request)) return privateJson({ error: "Invalid origin." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 500) return privateJson({ error: "Request too large." }, 413);
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return privateJson({ error: "Order ID and reference are required." }, 400);
  try {
    const deleted = await deleteRecordedOrder(parsed.data.id, parsed.data.reference);
    if (!deleted) return privateJson({ error: "Order not found. Refresh the list." }, 404);
    return privateJson({ deleted: true });
  } catch {
    return privateJson({ error: "Could not delete the record." }, 503);
  }
}
