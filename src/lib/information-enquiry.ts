import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import sharp from "sharp";
import { Resend } from "resend";
import { business } from "@/lib/business";

export type InformationEnquiryPdfData = {
  reference: string;
  name: string;
  mobile: string;
  message: string | null;
  productNames: string[];
  createdAt: Date;
};

function printable(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[^\u0020-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u20ac]/g, "?").trim();
}

export async function createInformationEnquiryPdf(data: InformationEnquiryPdfData) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("SRI VINAYAKA GROUPS — PRODUCT INFORMATION ENQUIRY");
  pdf.setAuthor(business.name);
  pdf.setSubject(`Informational enquiry ${data.reference}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.78, 0.53, 0.19), ink = rgb(0.14, 0.12, 0.10), muted = rgb(0.39, 0.36, 0.31);
  let page = pdf.addPage([595.28, 841.89]);
  const width = page.getWidth(), margin = 48;
  let y = page.getHeight() - 48;
  const ensure = (height: number) => { if (y - height < 52) { page = pdf.addPage([595.28, 841.89]); y = page.getHeight() - 50; } };
  const text = (value: string, size = 11, font = regular, color = ink, x = margin) => {
    const lines = wrap(printable(value), font, size, width - x - margin);
    for (const line of lines) { ensure(size * 1.55); page.drawText(line, { x, y, size, font, color }); y -= size * 1.55; }
  };
  try {
    const sourceLogo = await readFile(path.join(process.cwd(), "public", "branding", "sv-logo-full.webp"));
    const logoBytes = await sharp(sourceLogo).resize({ width: 720, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toBuffer();
    const logo = await pdf.embedPng(logoBytes);
    const dimensions = logo.scale(Math.min(190 / logo.width, 54 / logo.height));
    page.drawImage(logo, { x: margin, y: y - dimensions.height, width: dimensions.width, height: dimensions.height });
    y -= dimensions.height + 17;
  } catch { /* Keep document generation available if the optional brand asset is unavailable. */ }
  page.drawRectangle({ x: margin, y: y - 2, width: width - margin * 2, height: 2, color: gold }); y -= 24;
  text("SRI VINAYAKA GROUPS — PRODUCT INFORMATION ENQUIRY", 15, bold, gold);
  text(`Enquiry reference: ${data.reference}`, 11, bold);
  text(`Submitted: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(data.createdAt)} IST`, 10, regular, muted);
  y -= 12;
  const section = (title: string) => { ensure(25); text(title.toUpperCase(), 10, bold, gold); };
  section("Customer information");
  text(`Name: ${data.name}`); text(`Mobile: ${data.mobile}`);
  section("General enquiry");
  const message = data.message ? printable(data.message) : "No additional message provided.";
  for (const line of wrap(message, regular, 11, width - margin * 2)) { ensure(19); text(line); }
  section("Product information topics");
  if (data.productNames.length) for (const name of data.productNames) { ensure(19); text(`- ${name}`); }
  else text("No specific product topics selected.");
  y -= 10; ensure(100);
  page.drawRectangle({ x: margin, y: y - 70, width: width - margin * 2, height: 70, color: rgb(1, 0.96, 0.88), borderColor: gold, borderWidth: 1 });
  page.drawText("INFORMATION ONLY", { x: margin + 12, y: y - 20, size: 10, font: bold, color: ink });
  const disclaimer = wrap("This document is an informational enquiry only. It is not an order, booking, reservation, invoice, payment request, or confirmation of sale.", regular, 9, width - margin * 2 - 24);
  disclaimer.forEach((line, index) => page.drawText(line, { x: margin + 12, y: y - 38 - index * 13, size: 9, font: regular, color: ink }));
  y -= Math.max(92, 48 + disclaimer.length * 13); section("Sri Vinayaka Groups");
  text(`Phone: ${business.phone}`, 10); text(`Email: ${business.email}`, 10); text(`Location: ${business.address}`, 10);
  return Buffer.from(await pdf.save());
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number) {
  const words = value.split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) { lines.push(line); line = word; } else line = candidate; }
  if (line) lines.push(line);
  return lines;
}

export async function sendInformationEnquiryEmail(data: InformationEnquiryPdfData, pdf: Buffer) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || business.email;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("EMAIL_CONFIGURATION_MISSING");
  const summary = data.productNames.length ? data.productNames.slice(0, 8).join(", ") : "General product information";
  const result = await new Resend(apiKey).emails.send({
    from, to,
    subject: `Sri Vinayaka Groups — New Information Enquiry [${data.reference}]`,
    text: `A new informational enquiry was received.\nReference: ${data.reference}\nName: ${data.name}\nPhone: ${data.mobile}\nTopics: ${summary}\n\nThis is not an order, booking, reservation, payment request, or confirmation of sale.`,
    attachments: [{ filename: `${data.reference}.pdf`, content: pdf.toString("base64") }],
  });
  if (result.error) throw new Error("EMAIL_PROVIDER_REJECTED");
  return result.data?.id || null;
}
