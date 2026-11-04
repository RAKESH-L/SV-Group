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
