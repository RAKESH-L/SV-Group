import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { ADMIN_ESTIMATE_MAX_QUANTITY, calculateAdminEstimateLine, decimalPriceToPaise, summarizeAdminEstimate } from "@/lib/admin-estimate";
import { createAdminPriceEstimatePdf } from "@/lib/admin-price-estimate-pdf";
import { adminEstimatePdfFilename } from "@/lib/admin-pdf-filename";

type Context = { params: Promise<{ id: string }> };
const requestSchema = z.object({ lines: z.array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(ADMIN_ESTIMATE_MAX_QUANTITY) })).min(1).max(50) });

export async function POST(request: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12_000) return NextResponse.json({ error: "Estimate request is too large." }, { status: 413 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose at least one product and enter valid quantities." }, { status: 400 });
  const { id } = await params;
  const ids = parsed.data.lines.map(line => line.productId);
  if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "Each product can appear only once in an estimate." }, { status: 400 });

  try {
    const enquiry = await db.informationEnquiry.findUnique({ where: { id }, select: { reference: true, name: true, mobile: true, productNames: true } });
    if (!enquiry) return NextResponse.json({ error: "Information request not found." }, { status: 404 });
    const requestedProducts = await db.product.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, name: true, active: true, originalPrice: true, discountedPrice: true, category: { select: { name: true } } },
    });
    if (requestedProducts.length !== ids.length) return NextResponse.json({ error: "One or more selected products are no longer active. Refresh the estimate." }, { status: 400 });
    const names = [...new Set(requestedProducts.map(product => product.name))];
    if (names.some(name => !enquiry.productNames.includes(name))) return NextResponse.json({ error: "An estimate product was not part of this information request." }, { status: 400 });
    const exactNameMatches = await db.product.findMany({ where: { name: { in: names } }, select: { id: true, name: true } });
    if (requestedProducts.some(product => exactNameMatches.filter(match => match.name === product.name).length !== 1 || exactNameMatches.find(match => match.name === product.name)?.id !== product.id)) {
      return NextResponse.json({ error: "A product name matches multiple catalogue items and cannot be estimated unambiguously." }, { status: 400 });
    }

    const byId = new Map(requestedProducts.map(product => [product.id, product]));
    const lines = parsed.data.lines.map(input => {
      const product = byId.get(input.productId)!;
      return calculateAdminEstimateLine({
        productId: product.id,
        name: product.name,
        categoryName: product.category.name,
        quantity: input.quantity,
        originalUnitPaise: decimalPriceToPaise(product.originalPrice),
        indicativeUnitPaise: decimalPriceToPaise(product.discountedPrice),
      });
    });
    const generatedAt = new Date();
    const pdf = await createAdminPriceEstimatePdf({
      reference: enquiry.reference,
      name: enquiry.name,
      mobile: enquiry.mobile,
      generatedAt,
      lines,
      totals: summarizeAdminEstimate(lines),
    });
    const filename = adminEstimatePdfFilename(enquiry.mobile, enquiry.reference);
    return new NextResponse(new Uint8Array(pdf), { headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "private, no-store, max-age=0",
      "pragma": "no-cache",
      "expires": "0",
      "vary": "Cookie",
      "x-content-type-options": "nosniff",
    } });
  } catch {
    return NextResponse.json({ error: "We could not generate the estimate. Please refresh and try again." }, { status: 503 });
  }
}
