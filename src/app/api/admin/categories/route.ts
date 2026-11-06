import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { invalidatePublicCatalogue } from "@/lib/public-catalogue-data";
import { categorySchema } from "@/lib/validation";
export async function GET() { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json(await db.category.findMany({ orderBy: { name: "asc" } })); }
export async function POST(req: NextRequest) { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const parsed = categorySchema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 }); const slug = parsed.data.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); try { const saved = await db.category.create({ data: { ...parsed.data, slug } }); invalidatePublicCatalogue(); return NextResponse.json(saved, { status: 201 }); } catch { return NextResponse.json({ error: "A category with that name already exists." }, { status: 400 }); } }
