import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { informationRequestRateLimited } from "@/lib/information-request-rate-limit";
import { createInformationEnquiryPdf, sendInformationEnquiryEmail, type InformationEnquiryPdfData } from "@/lib/information-enquiry";

const schema = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(2, "Enter your name (at least 2 characters)." ).max(100),
  mobile: z.string().trim().regex(/^(?:\+91[ -]?)?[6-9]\d{9}$/, "Enter a valid Indian mobile number."),
  message: z.string().trim().max(1000).optional().default(""),
  productIds: z.array(z.string().min(1).max(64)).max(50).default([]),
  consent: z.literal(true, { error: "Please confirm this request is for general information only." }),
  website: z.string().max(200).optional().default(""),
});

function isUniqueViolation(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }

async function notify(enquiry: InformationEnquiryPdfData) {
  try {
    const pdf = await createInformationEnquiryPdf(enquiry);
    const messageId = await sendInformationEnquiryEmail(enquiry, pdf);
    await db.informationEnquiry.update({ where: { reference: enquiry.reference }, data: { emailStatus: "SENT", emailMessageId: messageId, emailErrorCode: null } });
  } catch (error) {
    const code = error instanceof Error && error.message === "EMAIL_CONFIGURATION_MISSING" ? "EMAIL_CONFIGURATION_MISSING" : error instanceof Error && error.message === "EMAIL_PROVIDER_REJECTED" ? "EMAIL_PROVIDER_REJECTED" : "EMAIL_SEND_FAILED";
    await db.informationEnquiry.update({ where: { reference: enquiry.reference }, data: { emailStatus: "FAILED", emailErrorCode: code } }).catch(() => undefined);
  }
}

export async function POST(req: NextRequest) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 20_000) return NextResponse.json({ error: "This request is too large." }, { status: 413 });
  const ip = req.headers.get("x-real-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  try {
    if (await informationRequestRateLimited(ip, 4, 10 * 60_000)) return NextResponse.json({ error: "Too many requests. Please wait before trying again." }, { status: 429 });
  } catch { return NextResponse.json({ error: "We could not verify this request right now. Please try again shortly." }, { status: 503 }); }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check the form and try again." }, { status: 400 });
  const input = parsed.data;
  if (input.website) return NextResponse.json({ ok: true, reference: "SVG-XXXXXX" }, { status: 202 });

  let prior;
  try { prior = await db.informationEnquiry.findUnique({ where: { idempotencyKey: input.idempotencyKey } }); }
  catch { return NextResponse.json({ error: "We could not receive your information request right now. Please try again shortly." }, { status: 503 }); }
  if (prior) return NextResponse.json({ ok: true, reference: prior.reference }, { status: 200 });

  const productIds = [...new Set(input.productIds)];
  let products;
  try { products = productIds.length ? await db.product.findMany({ where: { id: { in: productIds }, active: true }, select: { id: true, name: true } }) : []; }
  catch { return NextResponse.json({ error: "We could not verify the selected products right now. Please try again shortly." }, { status: 503 }); }
  if (products.length !== productIds.length) return NextResponse.json({ error: "One or more selected products are no longer available. Refresh the calculator and try again." }, { status: 400 });
  const productNames = products.map(product => product.name);

  let created;
  try {
    created = await db.informationEnquiry.create({ data: {
      reference: `SVG-${randomBytes(3).toString("hex").toUpperCase()}`,
      idempotencyKey: input.idempotencyKey,
      name: input.name,
      mobile: input.mobile,
      message: input.message || null,
      productNames,
      consentAt: new Date(),
    } });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const duplicate = await db.informationEnquiry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (duplicate) return NextResponse.json({ ok: true, reference: duplicate.reference }, { status: 200 });
    }
    return NextResponse.json({ error: "We could not save your information request. Please try again shortly." }, { status: 503 });
  }

  const notification: InformationEnquiryPdfData = { reference: created.reference, name: created.name, mobile: created.mobile, message: created.message, productNames: created.productNames, createdAt: created.createdAt };
  await notify(notification);
  return NextResponse.json({ ok: true, reference: created.reference }, { status: 201 });
}
