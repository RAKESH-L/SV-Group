import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
export async function GET() { if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json(await db.generalEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 200 })); }
