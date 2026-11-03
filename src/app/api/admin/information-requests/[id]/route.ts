import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Context) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const item = await db.informationEnquiry.findUnique({ where: { id: (await params).id } });
  if (!item) return NextResponse.json({ error: "Information request not found." }, { status: 404 });
  return NextResponse.json(item);
}
