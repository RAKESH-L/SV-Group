import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { business } from "@/lib/business";
import { embedServerGaneshPdfLogo } from "@/lib/pdf-logo-server";
import type { AdminEstimateProduct } from "@/lib/admin-estimate";
import { drawEstimatePdfBrandHeader, formatEstimatePdfPaise, printablePdfText, wrapPdfText, estimatePdfPalette } from "@/lib/pdf-design";

const pageWidth = 841.89;
const pageHeight = 595.28;
const left = 28;
const right = pageWidth - left;
const edges = [28, 178, 286, 326, 401, 476, 519, 617, 715, 813];

type EstimatePdfInput = {
  reference: string;
  name: string;
  mobile: string;
  generatedAt: Date;
  source?: "CUSTOMER_SUBMITTED" | "ADMIN_ENTERED";
  lines: AdminEstimateProduct[];
  totals: { distinctProducts: number; totalQuantity: number; originalSubtotalPaise: number; indicativeSubtotalPaise: number; savingsPaise: number; effectiveDiscountPercent: number };
};

function rightText(page: PDFPage, value: string, x: number, y: number, columnWidth: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  const safe = printablePdfText(value);
  page.drawText(safe, { x: x + columnWidth - font.widthOfTextAtSize(safe, size) - 4, y, size, font, color });
}

export async function createAdminPriceEstimatePdf(data: EstimatePdfInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(data.source === "CUSTOMER_SUBMITTED" ? "SRI VINAYAKA GROUPS - REQUESTED ITEMS PRICE ESTIMATE" : "SRI VINAYAKA GROUPS - ADMIN PRICE ESTIMATE");
  pdf.setAuthor(business.name);
  pdf.setSubject(`Admin-generated informational estimate ${data.reference}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { dark, gold, ink, muted, pale, white, rule } = estimatePdfPalette;
  const logo = await embedServerGaneshPdfLogo(pdf);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  function newPage() {
    page = pdf.addPage([pageWidth, pageHeight]);
    pages.push(page);
    drawEstimatePdfBrandHeader(page, logo, regular, bold, pageWidth, pageHeight, 88, left);
    page.drawText(data.source === "CUSTOMER_SUBMITTED" ? "REQUESTED ITEMS PRICE ESTIMATE" : "ADMIN PRICE ESTIMATE", { x: 220, y: pageHeight - 40, size: 13, font: bold, color: gold });
    page.drawText(data.source === "CUSTOMER_SUBMITTED" ? "Customer-selected quantities · indicative prices captured at submission" : "Current indicative catalogue values · administrator entered quantities", { x: 220, y: pageHeight - 58, size: 7.5, font: regular, color: white });
    page.drawText(`Enquiry ${printablePdfText(data.reference)}`, { x: right - 145, y: pageHeight - 39, size: 8, font: bold, color: white });
    page.drawText(`${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(data.generatedAt)} IST`, { x: right - 145, y: pageHeight - 58, size: 7, font: regular, color: white });
    y = pageHeight - 109;
  }

  function drawCustomerPanel() {
    const height = 49;
    page.drawRectangle({ x: left, y: y - height, width: right - left, height, color: pale, borderColor: gold, borderWidth: 0.7 });
    const fields = [
      ["CUSTOMER NAME", data.name],
      ["MOBILE NUMBER", data.mobile],
      ["ENQUIRY REFERENCE", data.reference],
      ["GENERATED (IST)", new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(data.generatedAt)],
    ];
    const columnWidth = (right - left - 24) / 4;
    fields.forEach(([label, value], index) => {
      const x = left + 9 + index * columnWidth;
      page.drawText(label, { x, y: y - 15, size: 5.8, font: bold, color: muted });
      const lines = wrapPdfText(value, bold, 7.2, columnWidth - 12);
      lines.slice(0, 2).forEach((line, lineIndex) => page.drawText(line, { x, y: y - 29 - lineIndex * 9, size: 7.2, font: bold, color: ink }));
    });
    y -= height + 13;
  }

  function drawTableHeader() {
    const labels = ["CATEGORY", "PRODUCT", "QTY", "ORIGINAL\nUNIT PRICE", "INDICATIVE\nUNIT PRICE", "DISCOUNT", "ORIGINAL\nLINE TOTAL", "INDICATIVE\nLINE TOTAL", "SAVINGS"];
    const height = 34;
    page.drawRectangle({ x: left, y: y - height, width: right - left, height, color: dark });
    labels.forEach((label, index) => label.split("\n").forEach((line, lineIndex) => page.drawText(line, { x: edges[index] + 4, y: y - 12 - lineIndex * 9, size: 5.9, font: bold, color: white })));
    y -= height;
  }

  function drawFooter() {
    pages.forEach((current, index) => {
      current.drawLine({ start: { x: left, y: 30 }, end: { x: right, y: 30 }, thickness: 0.6, color: gold });
      current.drawText(`${business.name} | Phone: ${business.phone} | Email: ${business.email} | ${business.address}`, { x: left, y: 17, size: 6, font: regular, color: muted, maxWidth: right - left - 76 });
      current.drawText(`Page ${index + 1} of ${pages.length}`, { x: right - 67, y: 17, size: 6.3, font: regular, color: muted });
    });
  }

  newPage();
  drawCustomerPanel();
  drawTableHeader();
  const selected = data.lines.filter(line => line.quantity > 0);
  selected.forEach((line, index) => {
    const categoryLines = wrapPdfText(line.categoryName, regular, 6.4, edges[1] - edges[0] - 10);
    const nameLines = wrapPdfText(line.name, bold, 6.6, edges[2] - edges[1] - 10);
    const rowHeight = Math.max(29, Math.max(categoryLines.length, nameLines.length) * 8.5 + 12);
    if (y - rowHeight < 58) {
      newPage();
      drawTableHeader();
    }
    page.drawRectangle({ x: left, y: y - rowHeight, width: right - left, height: rowHeight, color: index % 2 ? pale : rgb(1, 1, 1) });
    categoryLines.forEach((lineText, lineIndex) => page.drawText(lineText, { x: edges[0] + 4, y: y - 12 - lineIndex * 8.5, size: 6.4, font: regular, color: ink }));
    nameLines.forEach((lineText, lineIndex) => page.drawText(lineText, { x: edges[1] + 4, y: y - 12 - lineIndex * 8.5, size: 6.6, font: bold, color: ink }));
    const values = [
      String(line.quantity),
      formatEstimatePdfPaise(line.originalUnitPaise),
      formatEstimatePdfPaise(line.indicativeUnitPaise),
      `${line.discountPercent.toFixed(2)}%`,
      formatEstimatePdfPaise(line.originalLinePaise),
      formatEstimatePdfPaise(line.indicativeLinePaise),
      formatEstimatePdfPaise(line.savingsPaise),
    ];
    values.forEach((value, valueIndex) => rightText(page, value, edges[valueIndex + 2], y - 16, edges[valueIndex + 3] - edges[valueIndex + 2], regular, 5.7, valueIndex === 6 ? gold : ink));
    page.drawLine({ start: { x: left, y: y - rowHeight }, end: { x: right, y: y - rowHeight }, thickness: 0.35, color: rule });
    y -= rowHeight;
  });

  const summaryHeight = 116;
  const disclaimer = data.source === "CUSTOMER_SUBMITTED" ? "Informational price estimate showing customer-selected quantities and server-verified indicative catalogue prices recorded when this enquiry was submitted. This is not an order, reservation, invoice, sale, or confirmation of sale. No stock is held and prices are indicative." : "Admin-generated informational estimate. Quantities were entered by the administrator and are not necessarily customer-submitted quantities. This document is not an order, reservation, invoice or confirmation of sale. Catalogue prices are current indicative values at generation time and may change.";
  const disclaimerLines = wrapPdfText(disclaimer, regular, 7, right - left - 18);
  const disclaimerHeight = Math.max(43, disclaimerLines.length * 9 + 22);
  if (y - summaryHeight - disclaimerHeight - 15 < 52) newPage();
  y -= 8;
  page.drawRectangle({ x: left, y: y - summaryHeight, width: right - left, height: summaryHeight, color: pale, borderColor: gold, borderWidth: 0.8 });
  page.drawText("INDICATIVE PRICE SUMMARY", { x: left + 11, y: y - 17, size: 8.5, font: bold, color: gold });
  const summaryRows: [string, string][] = [
    ["Distinct products", String(data.totals.distinctProducts)],
    ["Total selected quantity", String(data.totals.totalQuantity)],
    ["Original subtotal", formatEstimatePdfPaise(data.totals.originalSubtotalPaise)],
    ["Total discount / savings", formatEstimatePdfPaise(data.totals.savingsPaise)],
    ["Effective discount", `${data.totals.effectiveDiscountPercent.toFixed(2)}%`],
    ["Indicative final total", formatEstimatePdfPaise(data.totals.indicativeSubtotalPaise)],
  ];
  summaryRows.forEach(([label, value], index) => {
    const rowY = y - 33 - index * 13;
    page.drawText(label, { x: left + 11, y: rowY, size: index === 5 ? 7.7 : 6.8, font: index === 5 ? bold : regular, color: ink });
    rightText(page, value, right - 175, rowY, 164, index === 5 ? bold : regular, index === 5 ? 8.5 : 6.8, index === 5 ? gold : ink);
  });
  y -= summaryHeight + 12;
  page.drawRectangle({ x: left, y: y - disclaimerHeight, width: right - left, height: disclaimerHeight, color: rgb(0.99, 0.95, 0.84), borderColor: gold, borderWidth: 0.7 });
  page.drawText(data.source === "CUSTOMER_SUBMITTED" ? "CUSTOMER-SELECTED · INFORMATIONAL ONLY" : "ADMINISTRATOR-ENTERED · INFORMATIONAL ONLY", { x: left + 9, y: y - 14, size: 6.7, font: bold, color: ink });
  disclaimerLines.forEach((line, index) => page.drawText(line, { x: left + 9, y: y - 26 - index * 9, size: 7, font: regular, color: ink }));

  drawFooter();
  return Buffer.from(await pdf.save());
}
