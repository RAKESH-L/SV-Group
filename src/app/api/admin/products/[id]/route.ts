import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { productSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized — please log in again." }, { status: 401 });

  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid product data." }, { status: 400 });
  }

  try {
    const product = await db.product.update({
      where: { id: (await params).id },
      data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null },
    });
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return NextResponse.json({ error: "Product not found." }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ error: "Product already exists. Try a different name." }, { status: 409 });
      if (error.code === "P2003") return NextResponse.json({ error: "The selected category is no longer available." }, { status: 400 });
    }
    console.error("Product update failed", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "unknown error");
    return NextResponse.json({ error: "Product save failed. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized — please log in again." }, { status: 401 });

  try {
    const id = (await params).id;
    const product = await db.product.findUnique({ where: { id }, select: { imageUrl: true } });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    await db.product.delete({ where: { id } });

    if (product.imageUrl) {
      const storageUrl = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
      if (storageUrl && key) {
        try {
          const parsed = new URL(product.imageUrl);
          const marker = `/storage/v1/object/public/${bucket}/`;
          const index = parsed.pathname.indexOf(marker);
          if (index >= 0) {
            const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
            const client = createClient(storageUrl, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
            const { error } = await client.storage.from(bucket).remove([path]);
            if (error) console.error("Could not remove deleted product image", error.message);
          }
        } catch {
          console.error("Could not remove deleted product image");
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product deletion failed", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "unknown error");
    return NextResponse.json({ error: "Product delete failed. Please try again." }, { status: 500 });
  }
}
