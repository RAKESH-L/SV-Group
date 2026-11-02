import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquirySchema } from "@/lib/validation";
import { rateLimited } from "@/lib/rate-limit";
import { sendEnquiryEmail } from "@/lib/mail";
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await rateLimited(`enquiry:${ip}`, 5, 60_000)) return NextResponse.json({ error: "Too many enquiries. Please try again in a minute." }, { status: 429 });
  const raw = await req.json().catch(() => null), parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check your details." }, { status: 400 });
  const data = parsed.data;
  try {
    const enquiry = await db.generalEnquiry.create({ data: { ...data, email: data.email || null } });
    try { await sendEnquiryEmail({ ...data, createdAt: enquiry.createdAt }); } catch (error) { console.error("Enquiry saved but notification failed", error); }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { console.error("Unable to save enquiry", error); return NextResponse.json({ error: "We could not receive your enquiry right now. Please try again shortly." }, { status: 503 }); }
}
