import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(["NEW", "CONTACTED", "RESOLVED"]) });
export async function PATCH(req: NextRequest, { params }: Ctx) { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 }); try { return NextResponse.json(await db.generalEnquiry.update({ where: { id: (await params).id }, data: parsed.data })); } catch { return NextResponse.json({ error: "Enquiry not found." }, { status: 404 }); } }
export async function DELETE(_req: NextRequest, { params }: Ctx) { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); await db.generalEnquiry.delete({ where: { id: (await params).id } }).catch(() => null); return NextResponse.json({ ok: true }); }
