import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { decodeEnquiryMessage } from "@/lib/information-request-snapshot";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const enquiry = await db.informationEnquiry.findUnique({ where: { id }, select: { reference: true, name: true, mobile: true, productNames: true, message: true } });
  if (!enquiry) return NextResponse.json({ error: "Information request not found." }, { status: 404 });

  const stored = decodeEnquiryMessage(enquiry.message);
  // New requests carry a server-verified snapshot. Read it without relying on
  // names or current catalogue prices; older requests retain manual quantities.
  if (stored.items.length) {
    return NextResponse.json({
      enquiry: { reference: enquiry.reference, name: enquiry.name, mobile: enquiry.mobile, hasSubmittedQuantities: true },
      products: stored.items.map(item => ({
        name: item.name, status: "READY", productId: item.productId,
        categoryName: item.categoryName, availability: "Indicative at submission",
        originalPrice: (item.originalUnitPaise / 100).toFixed(2),
        discountedPrice: (item.indicativeUnitPaise / 100).toFixed(2),
        submittedQuantity: item.quantity,
      })),
    }, { headers: { "cache-control": "private, no-store, max-age=0", vary: "Cookie" } });
  }
  const names = [...new Set(enquiry.productNames)];
  const matches = names.length ? await db.product.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, active: true, availability: true, originalPrice: true, discountedPrice: true, category: { select: { name: true } } },
  }) : [];
  const products = names.map(name => {
    const candidates = matches.filter(product => product.name === name);
    if (!candidates.length) return { name, status: "NOT_FOUND" as const, productId: null, categoryName: null, availability: null, originalPrice: null, discountedPrice: null };
    if (candidates.length > 1) return { name, status: "AMBIGUOUS" as const, productId: null, categoryName: null, availability: null, originalPrice: null, discountedPrice: null };
    const product = candidates[0];
    if (!product.active) return { name, status: "INACTIVE" as const, productId: null, categoryName: product.category.name, availability: product.availability, originalPrice: null, discountedPrice: null };
    return { name, status: "READY" as const, productId: product.id, categoryName: product.category.name, availability: product.availability, originalPrice: product.originalPrice.toString(), discountedPrice: product.discountedPrice.toString() };
  });

  return NextResponse.json({ enquiry: { reference: enquiry.reference, name: enquiry.name, mobile: enquiry.mobile, hasSubmittedQuantities: false }, products }, { headers: { "cache-control": "private, no-store, max-age=0", vary: "Cookie" } });
}
