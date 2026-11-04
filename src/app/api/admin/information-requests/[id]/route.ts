import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { decodeEnquiryMessage } from "@/lib/information-request-snapshot";

type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const item = await db.informationEnquiry.findUnique({ where: { id: (await params).id } });
  if (!item) return NextResponse.json({ error: "Information request not found." }, { status: 404 });
  const stored = decodeEnquiryMessage(item.message);
  return NextResponse.json({ ...item, message: stored.message, hasSubmittedQuantities: stored.items.length > 0 });
}


/**
 * Permanently removes one information enquiry, including its private recorded
 * quantity/price snapshot. This never touches products or other enquiries.
 */
export async function DELETE(request: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin actions require a same-origin browser request in addition to the
  // signed, httpOnly SameSite=Lax admin session cookie.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { id } = await params;
  if (!id || id.length > 128) return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });

  // Match the displayed enquiry reference as a second safeguard against
  // deleting a stale/wrong row when dashboard state changes.
  const body = await request.json().catch(() => null);
  const reference = body && typeof body === "object" && "reference" in body ? body.reference : null;
  if (typeof reference !== "string" || !/^SVG-[A-Z0-9]{6,20}$/.test(reference)) {
    return NextResponse.json({ error: "A valid enquiry reference is required." }, { status: 400 });
  }
  try {
    const result = await db.informationEnquiry.deleteMany({ where: { id, reference } });
    if (result.count !== 1) return NextResponse.json({ error: "Request not found or already deleted. Refresh the list." }, { status: 404 });
    return NextResponse.json({ ok: true, deletedReference: reference }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "Could not delete this request. Please try again." }, { status: 503 });
  }
}
