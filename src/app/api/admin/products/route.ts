import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { productSchema } from "@/lib/validation";
const slugify = (s: string) => `${s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}-${crypto.randomUUID().slice(0,6)}`;
export async function POST(req: NextRequest) { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const parsed = productSchema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 }); try { const product = await db.product.create({ data: { ...parsed.data, slug: slugify(parsed.data.name), imageUrl: parsed.data.imageUrl || null } }); return NextResponse.json(product, { status: 201 }); } catch { return NextResponse.json({ error: "Could not create product. Check that its category exists." }, { status: 400 }); } }
