import { NextResponse } from "next/server";
import { getPublicPushKey } from "@/lib/site-push";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const publicKey = await getPublicPushKey();
    return NextResponse.json({ publicKey }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Push notifications are not available." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
