import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";
type Ctx = { params: Promise<{ id: string }> };
export async function PUT(req: NextRequest, { params }: Ctx) { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const data = categorySchema.safeParse(await req.json().catch(() => null)); if (!data.success) return NextResponse.json({ error: data.error.issues[0]?.message }, { status: 400 }); const slug = data.data.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); try { return NextResponse.json(await db.category.update({ where: { id: (await params).id }, data: { ...data.data, slug } })); } catch { return NextResponse.json({ error: "Could not update category. Check its name and products." }, { status: 400 }); } }
export async function DELETE(_req: NextRequest, { params }: Ctx) { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { await db.category.delete({ where: { id: (await params).id } }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Remove or reassign this category's products first." }, { status: 400 }); } }
