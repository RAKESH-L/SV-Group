import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { decodeEnquiryMessage } from "@/lib/information-request-snapshot";

const statuses = ["NEW", "REVIEWED", "CLOSED"] as const;
const filterSchema = z.object({ q: z.string().trim().max(120).optional(), status: z.enum(statuses).optional(), from: z.string().optional(), to: z.string().optional() });

export async function GET(req: NextRequest) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = filterSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters." }, { status: 400 });
  const { q, status, from, to } = parsed.data;
  if ([from, to].some(date => date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) return NextResponse.json({ error: "Invalid date filter." }, { status: 400 });
  if ([from, to].some(date => date && new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date)) return NextResponse.json({ error: "Invalid date filter." }, { status: 400 });
  const createdAt = from || to ? { ...(from ? { gte: new Date(`${from}T00:00:00+05:30`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999+05:30`) } : {}) } : undefined;
  if (createdAt && Object.values(createdAt).some(date => date && !Number.isFinite(date.getTime()))) return NextResponse.json({ error: "Invalid date filter." }, { status: 400 });
  const items = await db.informationEnquiry.findMany({
    where: { ...(status ? { status } : {}), ...(createdAt ? { createdAt } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { mobile: { contains: q } }, { reference: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  return NextResponse.json(items.map(item => {
    const stored = decodeEnquiryMessage(item.message);
    return { ...item, message: stored.message, hasSubmittedQuantities: stored.items.length > 0 };
  }));
}

export async function PATCH(req: NextRequest) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ id: z.string().min(1), status: z.enum(statuses) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid enquiry status." }, { status: 400 });
  try {
    const item = await db.informationEnquiry.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
    return NextResponse.json({ id: item.id, status: item.status });
  } catch { return NextResponse.json({ error: "Information request not found." }, { status: 404 }); }
}
