import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { rateLimited } from "@/lib/rate-limit";
const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });
export async function POST(req: NextRequest) { const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; if (await rateLimited(`login:${ip}`, 5, 60_000)) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 }); const data = schema.safeParse(await req.json().catch(() => null)); if (!data.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 }); const email = data.data.email.trim().toLowerCase(); const admin = await db.admin.findUnique({ where: { email } }); if (!admin || !(await bcrypt.compare(data.data.password, admin.passwordHash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 }); await createSession(admin.id); return NextResponse.json({ ok: true }); }
