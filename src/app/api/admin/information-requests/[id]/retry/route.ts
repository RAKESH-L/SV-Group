import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId } from "@/lib/auth";
import { decodeEnquiryMessage } from "@/lib/information-request-snapshot";
import { rateLimited } from "@/lib/rate-limit";
import { createInformationEnquiryPdf, sendInformationEnquiryEmail } from "@/lib/information-enquiry";

type Context = { params: Promise<{ id: string }> };
export async function POST(_req: Request, { params }: Context) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await rateLimited(`information-email-retry:${adminId}`, 5, 60_000)) return NextResponse.json({ error: "Too many retry attempts. Wait a minute and try again." }, { status: 429 });
  const item = await db.informationEnquiry.findUnique({ where: { id: (await params).id } });
  if (!item) return NextResponse.json({ error: "Information request not found." }, { status: 404 });
  if (item.emailStatus === "SENT") return NextResponse.json({ error: "This notification was already accepted by the email provider." }, { status: 409 });
  try {
    const userMessage = decodeEnquiryMessage(item.message).message;
    const pdf = await createInformationEnquiryPdf({ reference: item.reference, name: item.name, mobile: item.mobile, message: userMessage, productNames: item.productNames, createdAt: item.createdAt });
    const emailMessageId = await sendInformationEnquiryEmail({ reference: item.reference, name: item.name, mobile: item.mobile, message: userMessage, productNames: item.productNames, createdAt: item.createdAt }, pdf);
    await db.informationEnquiry.update({ where: { id: item.id }, data: { emailStatus: "SENT", emailMessageId, emailErrorCode: null } });
    return NextResponse.json({ ok: true, emailStatus: "SENT" });
  } catch (error) {
    const emailErrorCode = error instanceof Error && error.message === "EMAIL_CONFIGURATION_MISSING" ? "EMAIL_CONFIGURATION_MISSING" : error instanceof Error && error.message === "EMAIL_PROVIDER_REJECTED" ? "EMAIL_PROVIDER_REJECTED" : "EMAIL_SEND_FAILED";
    await db.informationEnquiry.update({ where: { id: item.id }, data: { emailStatus: "FAILED", emailErrorCode } });
    return NextResponse.json({ error: emailErrorCode === "EMAIL_CONFIGURATION_MISSING" ? "Email is not configured. Set the verified sender and Resend API key, then retry." : "The notification could not be sent. The saved request is unchanged; please retry." }, { status: 503 });
  }
}
