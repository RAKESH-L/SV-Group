import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { createInformationEnquiryPdf } from "@/lib/information-enquiry";

type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const item = await db.informationEnquiry.findUnique({ where: { id: (await params).id } });
  if (!item) return NextResponse.json({ error: "Information request not found." }, { status: 404 });
  const pdf = await createInformationEnquiryPdf({ reference: item.reference, name: item.name, mobile: item.mobile, message: item.message, productNames: item.productNames, createdAt: item.createdAt });
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${item.reference}.pdf"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
