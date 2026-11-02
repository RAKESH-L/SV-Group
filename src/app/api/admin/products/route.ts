import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { productSchema } from "@/lib/validation";

const slugify = (value: string) => `${value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`;

export async function POST(req: NextRequest) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized — please log in again." }, { status: 401 });

  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid product data." }, { status: 400 });
  }

  try {
    const product = await db.product.create({
      data: {
        ...parsed.data,
        slug: slugify(parsed.data.name),
        imageUrl: parsed.data.imageUrl || null,
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return NextResponse.json({ error: "Product already exists. Try a different name." }, { status: 409 });
      if (error.code === "P2003") return NextResponse.json({ error: "The selected category is no longer available." }, { status: 400 });
    }
    console.error("Product creation failed", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "unknown error");
    return NextResponse.json({ error: "Product save failed. Please try again." }, { status: 500 });
  }
}
