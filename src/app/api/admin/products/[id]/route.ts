import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { productSchema } from "@/lib/validation";
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: NextRequest, { params }: Ctx) { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const parsed = productSchema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 }); try { const product = await db.product.update({ where: { id: (await params).id }, data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null } }); return NextResponse.json(product); } catch { return NextResponse.json({ error: "Could not update product." }, { status: 400 }); } }
export async function DELETE(_req: NextRequest, { params }: Ctx) { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { await db.product.delete({ where: { id: (await params).id } }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Could not delete product." }, { status: 400 }); } }
