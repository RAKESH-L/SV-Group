import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { createAdminInformationPdf } from "@/lib/admin-information-pdf";
import { adminInformationPdfFilename } from "@/lib/admin-pdf-filename";
import { decodeEnquiryMessage } from "@/lib/information-request-snapshot";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const item = await db.informationEnquiry.findUnique({ where: { id: (await params).id } });
  if (!item) return NextResponse.json({ error: "Information request not found." }, { status: 404 });

  let matchingProducts: { name: string; description: string; availability: string; category: { name: string } }[] = [];
  try {
    if (item.productNames.length) matchingProducts = await db.product.findMany({
      where: { name: { in: [...new Set(item.productNames)] } },
      select: { name: true, description: true, availability: true, category: { select: { name: true } } },
    });
  } catch { /* Keep historical topics downloadable if catalogue enrichment is temporarily unavailable. */ }

  const topics = item.productNames.map(name => {
    const candidates = matchingProducts.filter(product => product.name === name);
    const categoryNames = [...new Set(candidates.map(product => product.category.name))];
    const uniqueProduct = candidates.length === 1 ? candidates[0] : null;
    return {
      name,
      categoryName: categoryNames.length === 1 ? categoryNames[0] : null,
      description: uniqueProduct?.description ?? null,
      availability: uniqueProduct?.availability ?? null,
    };
  });

  const pdf = await createAdminInformationPdf({
    reference: item.reference,
    name: item.name,
    mobile: item.mobile,
    message: decodeEnquiryMessage(item.message).message,
    productNames: item.productNames,
    products: topics,
    createdAt: item.createdAt,
  });
  const filename = adminInformationPdfFilename(item.mobile, item.reference);
  const encodedFilename = encodeURIComponent(filename);
  return new NextResponse(new Uint8Array(pdf), { headers: {
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
    "cache-control": "private, no-store, max-age=0",
    "pragma": "no-cache",
    "expires": "0",
    "vary": "Cookie",
    "x-content-type-options": "nosniff",
  } });
}
