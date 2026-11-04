import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { ADMIN_ESTIMATE_MAX_QUANTITY, calculateAdminEstimateLine, decimalPriceToPaise, summarizeAdminEstimate, type AdminEstimateProduct } from "@/lib/admin-estimate";
import { decodeEnquiryMessage } from "@/lib/information-request-snapshot";
import { createAdminPriceEstimatePdf } from "@/lib/admin-price-estimate-pdf";
import { adminEstimatePdfFilename } from "@/lib/admin-pdf-filename";

type Context = { params: Promise<{ id: string }> };
const requestSchema = z.object({ lines: z.array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(ADMIN_ESTIMATE_MAX_QUANTITY) })).min(1).max(50) });

type Enquiry = { reference: string; name: string; mobile: string; productNames: string[]; message: string | null };

async function getEnquiry(id: string) {
  return db.informationEnquiry.findUnique({ where: { id }, select: { reference: true, name: true, mobile: true, productNames: true, message: true } });
}

function snapshotLines(enquiry: Enquiry): AdminEstimateProduct[] {
  return decodeEnquiryMessage(enquiry.message).items.map(item => calculateAdminEstimateLine({
    productId: item.productId, name: item.name, categoryName: item.categoryName,
    quantity: item.quantity, originalUnitPaise: item.originalUnitPaise, indicativeUnitPaise: item.indicativeUnitPaise,
  }));
}

async function pdfResponse(enquiry: Enquiry, lines: AdminEstimateProduct[]) {
  const pdf = await createAdminPriceEstimatePdf({
    reference: enquiry.reference, name: enquiry.name, mobile: enquiry.mobile,
    generatedAt: new Date(), lines, totals: summarizeAdminEstimate(lines),
  });
  const filename = adminEstimatePdfFilename(enquiry.mobile, enquiry.reference);
  return new NextResponse(new Uint8Array(pdf), { headers: {
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "cache-control": "private, no-store, max-age=0",
    "pragma": "no-cache", "expires": "0", "vary": "Cookie", "x-content-type-options": "nosniff",
  } });
}

// One-click download for requests that actually contain quantities submitted by the visitor.
export async function GET(_request: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const enquiry = await getEnquiry((await params).id);
    if (!enquiry) return NextResponse.json({ error: "Information request not found." }, { status: 404 });
    const lines = snapshotLines(enquiry);
    if (!lines.length) return NextResponse.json({ error: "This older enquiry did not record quantities. Open Price Summary PDF to enter an illustrative estimate." }, { status: 409 });
    return await pdfResponse(enquiry, lines);
  } catch {
    return NextResponse.json({ error: "Unable to generate the requested-items PDF." }, { status: 503 });
  }
}

// Older enquiries still support a private, administrator-entered informational estimate.
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
    const enquiry = await getEnquiry(id);
    if (!enquiry) return NextResponse.json({ error: "Information request not found." }, { status: 404 });
    const recorded = snapshotLines(enquiry);
    if (recorded.length) {
      // Never silently replace customer-submitted quantities with admin-edited ones.
      const expected = new Map(recorded.map(item => [item.productId, item.quantity]));
      if (ids.length !== expected.size || parsed.data.lines.some(item => expected.get(item.productId) !== item.quantity)) {
        return NextResponse.json({ error: "Submitted quantities are fixed for this enquiry. Download the recorded estimate instead." }, { status: 409 });
      }
      return await pdfResponse(enquiry, recorded);
    }
    const requestedProducts = await db.product.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, name: true, originalPrice: true, discountedPrice: true, category: { select: { name: true } } },
    });
    if (requestedProducts.length !== ids.length) return NextResponse.json({ error: "One or more products are no longer active. Refresh the estimate." }, { status: 400 });
    const names = [...new Set(requestedProducts.map(product => product.name))];
    if (names.some(name => !enquiry.productNames.includes(name))) return NextResponse.json({ error: "An estimate product was not part of this enquiry." }, { status: 400 });
    const exactNameMatches = await db.product.findMany({ where: { name: { in: names } }, select: { id: true, name: true } });
    if (requestedProducts.some(product => exactNameMatches.filter(match => match.name === product.name).length !== 1 || exactNameMatches.find(match => match.name === product.name)?.id !== product.id)) {
      return NextResponse.json({ error: "A catalogue name is ambiguous and cannot be estimated." }, { status: 400 });
    }
    const byId = new Map(requestedProducts.map(product => [product.id, product]));
    const lines = parsed.data.lines.map(input => {
      const product = byId.get(input.productId)!;
      return calculateAdminEstimateLine({
        productId: product.id, name: product.name, categoryName: product.category.name,
        quantity: input.quantity, originalUnitPaise: decimalPriceToPaise(product.originalPrice),
        indicativeUnitPaise: decimalPriceToPaise(product.discountedPrice),
      });
    });
    return await pdfResponse(enquiry, lines);
  } catch {
    return NextResponse.json({ error: "Could not generate the estimate PDF. Please refresh and try again." }, { status: 503 });
  }
}
