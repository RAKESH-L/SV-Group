import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { business } from "@/lib/business";
import { embedServerGaneshPdfLogo } from "@/lib/pdf-logo-server";
import { ESTIMATE_MARGIN, ESTIMATE_PAGE_HEIGHT, ESTIMATE_PAGE_WIDTH, ESTIMATE_RIGHT, drawEstimatePdfBrandHeader, estimatePdfPalette, printablePdfText, wrapPdfText } from "@/lib/pdf-design";

export type AdminInformationTopic = {
  name: string;
  categoryName: string | null;
  description: string | null;
  availability: string | null;
};

export type AdminInformationPdfData = {
  reference: string;
  name: string;
  mobile: string;
  message: string | null;
  productNames: string[];
  products: AdminInformationTopic[];
  createdAt: Date;
};

const margin = ESTIMATE_MARGIN;
const right = ESTIMATE_RIGHT;
const width = ESTIMATE_PAGE_WIDTH;

export async function createAdminInformationPdf(data: AdminInformationPdfData) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("SRI VINAYAKA GROUPS - PRODUCT INFORMATION ENQUIRY");
  pdf.setAuthor(business.name);
  pdf.setSubject(`Informational enquiry ${data.reference}`);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { dark, gold, ink, muted, pale, white, rule } = estimatePdfPalette;
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  let productTableActive = false;
  const logo = await embedServerGaneshPdfLogo(pdf);

  function newPage() {
    page = pdf.addPage([ESTIMATE_PAGE_WIDTH, ESTIMATE_PAGE_HEIGHT]);
    pages.push(page);
    drawEstimatePdfBrandHeader(page, logo, regular, bold, width, ESTIMATE_PAGE_HEIGHT, 108, margin);
    page.drawText("PRODUCT INFORMATION ENQUIRY", { x: 252, y: ESTIMATE_PAGE_HEIGHT - 49, size: 12.5, font: bold, color: gold });
    page.drawText(`Reference ${printablePdfText(data.reference)}`, { x: 252, y: ESTIMATE_PAGE_HEIGHT - 69, size: 8, font: bold, color: white });
    page.drawText(`Submitted ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(data.createdAt)} IST`, { x: 252, y: ESTIMATE_PAGE_HEIGHT - 87, size: 7, font: regular, color: white });
    y = ESTIMATE_PAGE_HEIGHT - 132;
  }

  function drawProductTableHeader() {
    const headerHeight = 30;
    page.drawRectangle({ x: margin, y: y - headerHeight, width: right - margin, height: headerHeight, color: dark });
    const columns = [margin + 7, 157, 333];
    ["CATEGORY", "PRODUCT", "OTHER AVAILABLE PRODUCT INFORMATION"].forEach((label, index) => {
      page.drawText(label, { x: columns[index], y: y - 18, size: index === 2 ? 6.3 : 7, font: bold, color: white });
    });
    y -= headerHeight;
  }

  function ensureSpace(height: number, repeatProductHeader = false) {
    if (y - height >= 70) return;
    newPage();
    if (repeatProductHeader && productTableActive) drawProductTableHeader();
  }

  function drawSectionTitle(value: string) {
    ensureSpace(24);
    page.drawText(printablePdfText(value.toUpperCase()), { x: margin, y: y - 10, size: 9, font: bold, color: gold });
    page.drawLine({ start: { x: margin, y: y - 15 }, end: { x: right, y: y - 15 }, thickness: 0.65, color: rule });
    y -= 24;
  }

  newPage();
  drawSectionTitle("Customer details");
  const fields: [string, string][] = [
    ["CUSTOMER NAME", data.name],
    ["MOBILE NUMBER", data.mobile],
    ["ENQUIRY REFERENCE", data.reference],
    ["SUBMITTED (IST)", new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(data.createdAt)],
  ];
  const cellWidth = (right - margin * 2 - 30) / 2;
  const preparedFields = fields.map(([label, value]) => ({ label, lines: wrapPdfText(value, bold, 8, cellWidth - 14) }));
  const fieldRowHeights = [0, 1].map(row => Math.max(34, Math.max(preparedFields[row * 2].lines.length, preparedFields[row * 2 + 1].lines.length) * 10 + 20));
  const panelHeight = fieldRowHeights.reduce((sum, value) => sum + value, 0) + 16;
  ensureSpace(panelHeight + 8);
  const panelTop = y;
  page.drawRectangle({ x: margin, y: panelTop - panelHeight, width: right - margin, height: panelHeight, color: pale, borderColor: gold, borderWidth: 0.8 });
  let rowTop = panelTop - 8;
  for (let row = 0; row < 2; row++) {
    const rowHeight = fieldRowHeights[row];
    for (let column = 0; column < 2; column++) {
      const field = preparedFields[row * 2 + column];
      const x = margin + 10 + column * (cellWidth + 10);
      page.drawText(field.label, { x, y: rowTop - 9, size: 6, font: bold, color: muted });
      field.lines.forEach((line, lineIndex) => page.drawText(line, { x, y: rowTop - 22 - lineIndex * 10, size: 8, font: bold, color: ink }));
    }
    rowTop -= rowHeight;
  }
  y = panelTop - panelHeight - 10;

  drawSectionTitle("General enquiry message");
  const message = data.message?.trim() || "No general enquiry message was recorded.";
  const messageLines = wrapPdfText(message, regular, 9, right - margin * 2 - 24);
  const messageHeight = Math.min(Math.max(35, messageLines.length * 13 + 22), ESTIMATE_PAGE_HEIGHT - 210);
  ensureSpace(messageHeight + 5);
  const visibleMessageLines = wrapPdfText(messageLines.join(" "), regular, 9, right - margin * 2 - 24).slice(0, Math.max(1, Math.floor((messageHeight - 20) / 13)));
  page.drawRectangle({ x: margin, y: y - messageHeight, width: right - margin, height: messageHeight, color: pale });
  visibleMessageLines.forEach((line, index) => page.drawText(line, { x: margin + 12, y: y - 14 - index * 13, size: 9, font: regular, color: ink }));
  y -= messageHeight + 8;

  drawSectionTitle("Product information topics");
  const productRows = data.products.length ? data.products : data.productNames.map(name => ({ name, categoryName: null, description: null, availability: null }));
  productTableActive = true;
  drawProductTableHeader();
  if (!productRows.length) {
    const emptyHeight = 34;
    ensureSpace(emptyHeight, true);
    page.drawRectangle({ x: margin, y: y - emptyHeight, width: right - margin, height: emptyHeight, color: pale });
    page.drawText("No product information topics were recorded.", { x: margin + 8, y: y - 21, size: 8, font: regular, color: ink });
    y -= emptyHeight;
  }
  for (const [index, product] of productRows.entries()) {
    const category = product.categoryName || "Not recorded";
    const categoryLines = wrapPdfText(category, regular, 7.2, 100);
    const nameLines = wrapPdfText(product.name, bold, 7.2, 166);
    const description = product.description?.trim() || null;
    const details = [
      product.availability ? `Current availability: ${product.availability}` : "Availability: Not recorded",
      description ? `Current catalogue description: ${description.slice(0, 260)}${description.length > 260 ? " [shortened]" : ""}` : null,
    ].filter(Boolean).join(" | ");
    const detailLines = wrapPdfText(details, regular, 7, 194);
    const rowHeight = Math.max(31, Math.max(categoryLines.length, nameLines.length, detailLines.length) * 9 + 12);
    ensureSpace(rowHeight, true);
    page.drawRectangle({ x: margin, y: y - rowHeight, width: right - margin, height: rowHeight, color: index % 2 ? pale : rgb(1, 1, 1) });
    categoryLines.forEach((line, lineIndex) => page.drawText(line, { x: margin + 7, y: y - 13 - lineIndex * 9, size: 7.2, font: regular, color: category === "Not recorded" ? muted : ink }));
    nameLines.forEach((line, lineIndex) => page.drawText(line, { x: 157, y: y - 13 - lineIndex * 9, size: 7.2, font: bold, color: ink }));
    detailLines.forEach((line, lineIndex) => page.drawText(line, { x: 333, y: y - 13 - lineIndex * 9, size: 7, font: regular, color: muted }));
    page.drawLine({ start: { x: margin, y: y - rowHeight }, end: { x: right, y: y - rowHeight }, thickness: 0.35, color: rule });
    y -= rowHeight;
  }
  productTableActive = false;

  const historyNote = "Historical request records store product topics only. Quantity and price information: Not recorded. Estimate totals are omitted. Product categories and descriptions above are resolved from the current catalogue and are not historical snapshots.";
  const historyLines = wrapPdfText(historyNote, regular, 7.5, right - margin * 2 - 20);
  const disclaimer = "This document is an informational enquiry only. It is not an order, booking, reservation, invoice, payment request, or confirmation of sale.";
  const disclaimerLines = wrapPdfText(disclaimer, regular, 8, right - margin * 2 - 20);
  const noticeHeight = historyLines.length * 10 + disclaimerLines.length * 11 + 38;
  ensureSpace(noticeHeight + 12);
  page.drawRectangle({ x: margin, y: y - noticeHeight, width: right - margin, height: noticeHeight, color: pale, borderColor: gold, borderWidth: 0.8 });
  page.drawText("INFORMATION ONLY - NO ORDER OR PRICE ESTIMATE", { x: margin + 10, y: y - 15, size: 7.8, font: bold, color: gold });
  historyLines.forEach((line, index) => page.drawText(line, { x: margin + 10, y: y - 28 - index * 10, size: 7.5, font: regular, color: ink }));
  const disclaimerY = y - 31 - historyLines.length * 10;
  disclaimerLines.forEach((line, index) => page.drawText(line, { x: margin + 10, y: disclaimerY - index * 11, size: 8, font: regular, color: ink }));

  pages.forEach((current, index) => {
    current.drawLine({ start: { x: margin, y: 48 }, end: { x: right, y: 48 }, thickness: 0.6, color: gold });
    current.drawText(`${business.name} | Phone: ${business.phone} | Email: ${business.email} | Location: ${business.address}`, { x: margin, y: 34, size: 6.3, font: regular, color: muted, maxWidth: right - margin - 66 });
    current.drawText(`Page ${index + 1} of ${pages.length}`, { x: right - 58, y: 34, size: 6.5, font: regular, color: muted });
  });
  return Buffer.from(await pdf.save());
}
